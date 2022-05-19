const request = require('supertest')

let dataStub = {
  "asa_id": 1,
  "supply": 2000,
  "status": 'swapped'
}
describe('NFTs', () => {
  it.skip('can be burned', async () => {
    const id = await createNft()
    const response = await request(strapi.server)
      .put(`/nfts/${id}/burn`)
    expect(response.body.status).toBe('burned')
  })
})

const createNft = async () => {
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