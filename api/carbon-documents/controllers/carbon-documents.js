'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */
const mailer = require(`${process.cwd()}/utils/mailer`)

async function create(ctx) {
  const collectionName = ctx.originalUrl.substring(1)
  const applicationUid = strapi.api[collectionName].models[collectionName].uid
  const createdDocument = await strapi.services[collectionName].create(ctx.request.body)
  const url = `${process.env.BASE_URL}${process.env.CONTENT_MANAGER_URL}/${applicationUid}/${createdDocument.id}`
  const mailContent = `User ${ctx.state.user.email} sent a new document.\nAvailable here: ${url}`
  await mailer.send('New document', mailContent)
  return createdDocument
}

module.exports = {
  create,
}
