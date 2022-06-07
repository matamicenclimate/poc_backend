const { expect } = require('@jest/globals')
const request = require('supertest')
const path = require('path')
const Controller = require('../../../api/compensations/controllers/compensations')
var { ObjectId } = require('mongodb')
let user
describe('Compensations', () => {
  beforeAll(async () => {
    user = (await strapi.query('user', 'users-permissions').find({ username: 'pepe' }))[0]
    if (!user) {
      const publicRole = await strapi.query('role', 'users-permissions').findOne({ type: 'public' })
      user = await strapi.query('user', 'users-permissions').create({
        username: 'pepe',
        email: 'pepe@test.com',
        type: 'developer',
        role: publicRole,
      })
    }
  })
  afterAll(async () => {
    await strapi.query('user', 'users-permissions').delete({ id: user.id })
  })
  it.skip('Mint compensations upload files to ipfs', async () => {
    jest.spyOn(Controller.algoFn, 'mintCompensationNft').mockImplementation()

    const id = await createCompensation()
    await request(strapi.server).post(`/compensations/${id}/mint`)

    const updatedCompensation = await strapi.services['compensations'].find({ _sort: 'id:desc' })
    expect(updatedCompensation[0].consolidation_certificate_ipfs_cid).toBeTruthy()
  }, 30000)
  it.skip('POST /compensations', async () => {
    const id = await createNft()
    const dataStub = {
      nfts: [id],
      txn_id: 'txnId',
      amount: 100,
      user,
    }
    const response = await request(strapi.server)
      .post(`/compensations`)
      .send({ ...dataStub })
    expect(response.body).toBeDefined()
    const nft = await findNft(id)
    expect(nft.body.status).toBe('swapped')
  })
})
const findNft = async (id) => {
  return await request(strapi.server).get(`/nfts/${id}`)
}
const createNft = async () => {
  const dataStub = {
    asa_id: 1,
    supply: 2000,
    status: 'swapped',
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

const createCompensation = async () => {
  const id = await createNft()
  const dataStub = {
    nfts: [id],
    txn_id: 'txnId',
    amount: 100,
    state: 'received_certificates',
    user,
  }
  const response = await request(strapi.server)
    .post(`/compensations`)
    .send({ ...dataStub })

  await request(strapi.server)
    .put(`/compensations/${response.body.id}`)
    .type('form')
    .field('data', JSON.stringify({}))
    .attach('files.registry_certificates', path.resolve(__dirname, '../../helpers/test-file.pdf'))
  return response.body.id
}
