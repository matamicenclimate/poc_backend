const Strapi = require('strapi');
const http = require('http');

let instance;

async function setupStrapi() {
  if (!instance) {
    /** the following code in copied from `./node_modules/strapi/lib/Strapi.js` */
    await Strapi().load();
    await grantPrivilegesToAllRoutes(strapi)
    instance = strapi; // strapi is global now
    
    await instance.app
      .use(instance.router.routes()) // populate KOA routes
      .use(instance.router.allowedMethods()); // populate KOA methods

    instance.server = http.createServer(instance.app.callback());
  }
  return instance;
}

async function grantPrivilegesToAllRoutes(strapi) {
  const publicRole = await strapi.query('role', 'users-permissions').findOne({ type: 'public'});
  const permissions = await strapi
    .query("permission", "users-permissions")
    .find({ type: "application", role: publicRole.id });

  await Promise.all(
    permissions.map(p =>
      strapi
        .query("permission", "users-permissions")
        .update({ id: p.id }, { enabled: true })
    )
  )
}

async function deleteDbUploadFiles() {
 await strapi.query('file', 'upload').model.deleteMany({});
}

module.exports = { 
  setupStrapi,
  deleteDbUploadFiles 
};
