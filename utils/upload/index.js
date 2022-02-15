'use strict'

const mime = require('mime-types')

async function pushFile(ctx) {
  const file = ctx.request.files.document
  return await strapi.plugins.upload.services.upload.upload({
    data:{},
    files: {
      path: file.path, 
      name: file.name,
      type: mime.lookup(file.path),
      size: file.size,
    },
  });
}

module.exports = {
  pushFile
}