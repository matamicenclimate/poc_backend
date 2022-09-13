const { setupStrapi, deleteDbUploadFiles } = require('./helpers/strapi')
const algosdk = require('algosdk')
const { createAuthenticatedUser, deleteUser } = require('./features/helpers')

jest.setTimeout(60000)

beforeAll(async () => {
  await setupStrapi()
  const result = await createAuthenticatedUser()
  user = result.user
  jwt = result.jwt
})

afterAll(async () => {
  await deleteUser(user.id)
  await deleteDbUploadFiles()
  await strapi.destroy()
})

require('./features')
