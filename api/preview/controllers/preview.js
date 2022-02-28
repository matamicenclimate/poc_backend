'use strict'

const fs = require("fs")

async function find(ctx) {
  const { contentType, id } = ctx.params
  const content = await strapi.services[contentType].findOne({ id })

  const path = content.document.url.split(process.env.BASE_URL)[1]
  const file = fs.createReadStream(`./public${path}`)
  ctx.set('Content-Type', 'application/pdf')
  ctx.body = file

  return ctx
}

module.exports = {
  find
}