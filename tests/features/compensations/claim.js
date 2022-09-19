const request = require('supertest')
const path = require('path')
const fs = require('fs')
const { algoClient, algoIndexer } = require('../../../config/algorand')
const userWallet = require('../helpers/wallet')
const { signEncodedTransactions } = require('../helpers')

describe('Claim NFT', () => {
  const indexerClient = algoIndexer()
  const client = algoClient()
  let claimPreparationObject
  test('Prepare claim certificate NFT', async () => {
    const response = await request(strapi.server)
      .get(`/compensations/${createdCompensation.id}/claim/certificate`)
      .expect(200)
      .expect('Content-Type', /json/)
      .set('Authorization', 'Bearer ' + jwt)
    expect(response.body).toBeDefined()
    expect(response.body.encodedSendTxn).toBeDefined()
    claimPreparationObject = response.body
  })
  test('User claims certificate NFT', async () => {
    const signedTxn = signEncodedTransactions([
      claimPreparationObject.encodedOptinTxn,
      claimPreparationObject.encodedSendTxn,
    ])

    const response = await request(strapi.server)
      .post(`/compensations/${createdCompensation.id}/claim/certificate`)
      .set('Authorization', 'Bearer ' + jwt)
      .send({ signedTxn })
      .expect(200)
    expect(response.body).toBeDefined()
    expect(response.body.state).toBe('claimed')
    createdCompensation = response.body
  })
  test('Certificate NFT Holdings', async () => {
    const userCompensationNFTHoldings = await indexerClient
      .lookupAccountAssets(userWallet.user.wallet)
      .assetId(Number(createdCompensation.compensation_nft.asa_id))
      .do()
    expect(userCompensationNFTHoldings?.assets[0].amount).toBe(1)
  })
})
