const wallets = require('./wallet')
const algosdk = require('algosdk')
const createPublicUser = async () => {
  let user = (await strapi.query('user', 'users-permissions').find({ username: 'pepe' }))[0]
  if (!user) {
    const publicRole = await strapi.query('role', 'users-permissions').findOne({ type: 'public' })
    user = await strapi.query('user', 'users-permissions').create({
      username: 'pepe',
      email: 'pepe@test.com',
      type: 'developer',
      role: publicRole,
    })
  }

  return {
    user,
  }
}

const createAuthenticatedUser = async () => {
  const username = Buffer.from(algosdk.decodeAddress(wallets.user.wallet).publicKey).toString('base64')
  user = await strapi.plugins['users-permissions'].services.user.fetch({ username })
  if (!user) {
    const authenticatedRole = await strapi.query('role', 'users-permissions').findOne({ type: 'authenticated' })
    user = await strapi.query('user', 'users-permissions').create({
      username,
      email: 'pepa@test.com',
      type: 'buyer',
      role: authenticatedRole,
      confirmed: false,
      language: 'en',
      publicAddress: wallets.user.wallet,
      issuer: 'my-algo-connect',
    })
  }
  jwt = await strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id })

  return {
    user,
    jwt,
  }
}

const createAdminUser = async () => {
  const role = await strapi.query('role', 'admin').findOne({ code: 'strapi-super-admin' })
  let superAdmin = await strapi.query('user', 'admin').findOne({ email: 'admintest@admin.com', roles: [role.id] })
  if (superAdmin == null) {
    superAdmin = await strapi
      .query('user', 'admin')
      .create({ blocked: false, email: 'admintest@admin.com', firstname: 'Admin', isActive: true, roles: [role.id] })
  }
  return strapi.admin.services.token.createJwtToken(superAdmin)
}

const deleteUser = async (userId) => {
  await strapi.query('user', 'users-permissions').delete({ id: userId })
}

const fetchUser = async (userId) => {
  return await strapi.plugins['users-permissions'].services.user.fetch({ id: userId })
}

module.exports = {
  createPublicUser,
  createAuthenticatedUser,
  createAdminUser,
  deleteUser,
  fetchUser,
}
