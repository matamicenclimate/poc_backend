const request = require('supertest')

describe('Token', () => {
  let dataStub = {
    asa_id: '123456789',
    asa_txn_id: 'asa_txn_id',
    algoexplorer_url: 'algoexplorer_url',
    price: 1,
  }

  it('PUT /token', async () => {
    await request(strapi.server)
      .put('/token')
      .send(dataStub)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.asa_id).toBe(dataStub.asa_id)
      })
  })

  it('GET /token', async () => {
    await request(strapi.server)
      .get(`/token`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.asa_id).toBe(dataStub.asa_id)
      })
  })

  it('DELETE /token', async () => {
    await request(strapi.server)
      .delete('/token')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.asa_id).toBe(dataStub.asa_id)
      })
  })
})
