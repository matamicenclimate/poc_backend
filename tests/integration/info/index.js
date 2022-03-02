const request = require('supertest')

describe('Info', () => {
  it('GET /info', async () => {
    await request(strapi.server)
      .get(`/info`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })
})
