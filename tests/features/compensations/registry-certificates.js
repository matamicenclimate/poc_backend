const { createAuthenticatedUser, deleteUser } = require('../helpers')
let user, jwt
beforeAll(async () => {
    const result = await createAuthenticatedUser()
    user = result.user
    jwt = result.jwt
})
afterAll(async () => {
    await deleteUser(user.id)
})
test.skip('can registry certificate pdfs', () => {
    expect(true).toBe(true)
})