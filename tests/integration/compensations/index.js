const { expect } = require('@jest/globals')
const request = require('supertest')

describe('Compensations', () => {
  
  it('POST /compensations', async () => {
    const id = await createNft()
    const dataStub = {
      nfts: [id],
      txnId: 'txnId',
    }
    const response = await request(strapi.server)
      .post(`/compensations`)
      .send({...dataStub})
    expect(response.body).toBeDefined()
    const nft = await findNft(id)
    expect(nft.body.status).toBe('burned')
  })
})
const findNft = async (id) => {
  return await request(strapi.server)
      .get(`/nfts/${id}`)
}
const createNft = async () => {
  const dataStub = {
    "asa_id": 1,
    "supply": 2000,
    "status": 'swapped'
  }
  return await request(strapi.server)
      .post(`/nfts`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        return response.body.id
      })
}