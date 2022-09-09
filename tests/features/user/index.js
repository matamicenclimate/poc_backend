const { createAuthenticatedUser, deleteUser } = require('../helpers')
describe('User', () => {
  beforeAll(async () => {
    const result = await createAuthenticatedUser()
    user = result.user
    jwt = result.jwt
  })
  afterAll(async () => {
    await deleteUser(user.id)
  })
  require('./email')
})
