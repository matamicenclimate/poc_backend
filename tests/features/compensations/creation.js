const request = require('supertest')
const path = require('path')
const fs = require('fs')
const {signEncodedTransactions} = require("../helpers");
const userWallet = require("../helpers/wallet");
const algosdk = require("algosdk");
const {algoIndexer} = require("../../../config/algorand");

describe('Create', () => {
  const indexerClient = algoIndexer()
  let dataStub = {
    amount: 50
  }
  let calculationObject

  test('Prepare creation', async () => {
    const response = await request(strapi.server)
      .get(`/compensations/calculate?amount=${dataStub.amount}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .set('Authorization', 'Bearer ' + jwt)
    expect(response.body).toBeDefined()
    expect(response.body.amount).toBe(dataStub.amount)
    calculationObject = response.body
  })
  test('Create Compensation', async () => {
    const signedTxn = signEncodedTransactions([
      calculationObject.encodedTransferTxn,
      calculationObject.encodedFundsTxn,
      calculationObject.encodedParamsTxn,
      calculationObject.encodedBurnTxn,
    ])
    const burnResponse = await request(strapi.server)
      .post(`/compensations`)
      .set('Authorization', 'Bearer ' + jwt)
      .send({
        signedTxn,
        nfts: calculationObject.nftIds,
        signature: calculationObject.signature,
      amount: calculationObject.amount
      })
      .expect(200)
    expect(burnResponse.body).toBeDefined()
    expect(Number(burnResponse.body.amount)).toBe(dataStub.amount)
    createdCompensation = burnResponse.body
  })
  test("Created Compensation holdings", async () => {
    createdCompensation = await strapi.services.compensations.findOne({id: createdCompensation.id})
    const burnAppAddress = algosdk.getApplicationAddress(Number(createdCompensation.contract_id))
    for (const nft of createdCompensation.nfts) {
      const burnContractNftHoldings = await indexerClient
        .lookupAccountAssets(burnAppAddress)
        .assetId(Number(nft.asa_id))
        .do()
      const nftHoldingAmount = burnContractNftHoldings?.assets[0].amount
      expect(nftHoldingAmount).toBe(createdCompensation.burn_receipt[Number(nft.asa_id)])
    }

    const burnAppClimatecoinHoldings = await indexerClient
      .lookupAccountAssets(burnAppAddress)
      .assetId(Number(process.env.CLIMATECOIN_ASA_ID))
      .do()
    expect(burnAppClimatecoinHoldings?.assets[0].amount).toBe(
      Number(createdCompensation.amount),
    )
  })
})
