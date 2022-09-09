const request = require('supertest')
const { fetchUser } = require('../helpers')

describe('Email', () => {
  let emailVerificationToken
  test('Email modification', async () => {
    await request(strapi.server)
      .put(`/users/profile`)
      .set('Authorization', 'Bearer ' + jwt)
      .field('email', `test.${user.email}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then(async (response) => {
        expect(response.body).toBeDefined()
        expect(response.body.confirmed).toBe(false)
        user = await fetchUser(user.id)
        expect(user.confirmationToken).toBeDefined()
        expect(user.confirmed).toBe(false)
        emailVerificationToken = user.confirmationToken
      })
  })

  test('Email verification', async () => {
    await request(strapi.server)
      .get(`/users/verify?token=${emailVerificationToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then(async (response) => {
        expect(response.body).toBeDefined()
        user = await fetchUser(user.id)
        expect(user.confirmationToken).toBe(null)
        expect(user.confirmed).toBe(true)
      })
  })
})
