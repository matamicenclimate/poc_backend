'use strict'

const mailer = require(`${process.cwd()}/utils/mailer`)
const fileUploader = require(`${process.cwd()}/utils/upload`)
const { default: algosdk } = require('algosdk')

async function create(ctx) {
  const collectionName = ctx.originalUrl.substring(1)
  const applicationUid = strapi.api[collectionName].models[collectionName].uid
  const pushFileResponse = await fileUploader.pushFile(ctx)
  if (pushFileResponse[0]) {
    strapi.log.info(`[${pushFileResponse[0].url}] file uploaded`)
    ctx.request.body.document = pushFileResponse[0].id
  }

  const createdDocument = await strapi.services[collectionName].create(ctx.request.body)
  if (process.env.NODE_ENV === 'test') {
    return createdDocument
  }

  const url = `${process.env.BASE_URL}${process.env.CONTENT_MANAGER_URL}/${applicationUid}/${createdDocument.id}`
  const mailContent = `User ${ctx.state.user.email} sent a new document.\nAvailable here: ${url}`
  await mailer.send('New document', mailContent)
  return createdDocument
}

async function mint() {
  const token = 'Your algod API token'
  const server = 'http://127.0.0.1'
  const port = 8080
  const client = new algosdk.Algodv2(token, server, port)

  console.log(await client.status().do())
}

module.exports = {
  create,
  mint,
}
