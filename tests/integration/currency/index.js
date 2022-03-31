const request = require('supertest')

describe('Currency', () => {
  let dataStub = {
    usd_eur: 0.92,
    usd_jpy: 110.3,
    usd_gbp: 0.73,
    usd_btc: 0.000028,
    usd_usd: 1,
  }

  let createdElement

  it('PUT /currency', async () => {
    await request(strapi.server)
      .put(`/currency`)
      .send(dataStub)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.usd_eur).toBe(dataStub.usd_eur)
        createdElement = response.body
      })
  })

  it('GET /currency', async () => {
    await request(strapi.server)
      .get(`/currency`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('DELETE /currency', async () => {
    await request(strapi.server)
      .delete('/currency')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.usd_eur).toBe(createdElement.usd_eur)
      })
  })
})
