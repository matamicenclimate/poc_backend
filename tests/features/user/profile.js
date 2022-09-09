const request = require('supertest')
const { fetchUser } = require('../helpers')

describe('Profile', () => {
  test('Type update', async () => {
    await request(strapi.server)
      .put(`/users/type`)
      .set('Authorization', 'Bearer ' + jwt)
      .send({ type: 'developer' })
      .expect(200)
      .expect('Content-Type', /json/)
      .then(async (response) => {
        expect(response.body).toBeDefined()
        user = await fetchUser(user.id)
        expect(user.type).toBe('developer')
      })
  })
})
