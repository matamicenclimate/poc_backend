const { setupStrapi, deleteDbUploadFiles } = require('./helpers/strapi')
const algosdk = require('algosdk')
const { createAuthenticatedUser, deleteUser, createAdminUser } = require('./features/helpers')

jest.setTimeout(60 * 1000 * 5)

beforeAll(async () => {
  await setupStrapi()
  const authUser = await createAuthenticatedUser()
  user = authUser.user
  jwt = authUser.jwt
  const adminUser = await createAdminUser()
  adminJwt = adminUser
})

afterAll(async () => {
  await deleteUser(user.id)
  await deleteDbUploadFiles()
  await strapi.destroy()
})

require('./features')
