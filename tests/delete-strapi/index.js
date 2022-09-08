const { deleteDbUploadFiles } = require('../helpers/strapi');

afterAll(async() => {
  await deleteDbUploadFiles()
  await strapi.destroy();
})