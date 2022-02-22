'use strict'

const fs = require("fs")

async function find(ctx) {
  const { contentType, id } = ctx.params
  const content = await strapi.services[contentType].findOne({ id })

  const file = fs.createReadStream(content.document.url)
  const filename = file.path.split('/').pop()
  ctx.set('Content-Type', 'application/pdf')
  ctx.set('Content-disposition', `attachment;filename=${filename}`)
  ctx.body = file

  return ctx
}

module.exports = {
  find
}