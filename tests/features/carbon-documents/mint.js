const request = require('supertest')
const path = require('path')
const fs = require('fs')
const { algoClient, algoIndexer } = require('../../../config/algorand')
const algosdk = require('algosdk')

describe('Mint', () => {
  const indexerClient = algoIndexer()
  async function updateCarbonDocStatus(newStatus) {
    createdDocument = await strapi.services['carbon-documents'].update(
      { id: createdDocument.id },
      {
        status: newStatus,
      },
    )
  }
  test('Approve carbon document status', async () => {
    await updateCarbonDocStatus('accepted')
    expect(createdDocument.status).toBe('accepted')
    await updateCarbonDocStatus('waiting_for_credits')
    expect(createdDocument.status).toBe('waiting_for_credits')
    await updateCarbonDocStatus('completed')
    expect(createdDocument.status).toBe('completed')
  })
  test('User Mint Denial', async () => {
    await request(strapi.server)
      .post(`/carbon-documents/${createdDocument.id}/mint`)
      .set('Authorization', 'Bearer ' + jwt)
      .expect(403)
  })
  test('Mint', async () => {
    await request(strapi.server)
      .post(`/carbon-documents/${createdDocument.id}/mint`)
      .set('Authorization', 'Bearer ' + adminJwt)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.status).toBe('minted')
        expect(response.body.developer_nft.asa_id).toBeDefined()
        createdDocument = response.body
      })
    const holdings = await indexerClient
      .lookupAssetBalances(createdDocument.developer_nft.asa_id)
      .currencyGreaterThan(0)
      .do()
    const appadd = algosdk.getApplicationAddress(Number(process.env.APP_ID))
    const appHoldings = holdings.balances.filter((holding) => holding.address == appadd)[0]
    expect(appHoldings.amount).toBe(Number(createdDocument.developer_nft.supply))
  })
})
