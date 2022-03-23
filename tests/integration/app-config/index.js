const request = require('supertest')

describe('APP Config', () => {
  let dataStub = {
    climatecoin_asa_id: '123456789',
    climatecoin_asa_txn_id: 'asa_txn_id',
    climatecoin_algoexplorer_url: 'algoexplorer_url',
    climatecoin_price: 1,
    usdc_asa_id: '123456789',
    climatecoin_app_id: '123456789',
  }

  it('PUT /app-config', async () => {
    await request(strapi.server)
      .put('/app-config')
      .send(dataStub)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.asa_id).toBe(dataStub.asa_id)
      })
  })

  it('GET /app-config', async () => {
    await request(strapi.server)
      .get(`/app-config`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.asa_id).toBe(dataStub.asa_id)
      })
  })

  it('DELETE /app-config', async () => {
    await request(strapi.server)
      .delete('/app-config')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.asa_id).toBe(dataStub.asa_id)
      })
  })
})
