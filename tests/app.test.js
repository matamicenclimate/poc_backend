const fs = require('fs')
const { setupStrapi, deleteDbUploadFiles } = require('./helpers/strapi')
const algosdk = require('algosdk')

jest.setTimeout(10000)

beforeAll(async () => {
  await setupStrapi()
})

afterAll(async () => {
  await deleteDbUploadFiles()
  await strapi.destroy()
})

require('./features')
