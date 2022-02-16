const request = require('supertest')

describe('Registries', () => {
  it('GET /registries', async () => {
  await request(strapi.server)
    .get(`/registries`)
    .expect(200)
    .expect('Content-Type', /json/)
    .then((response) => {
      expect(response.body).toBeDefined()
    })
  })
})
