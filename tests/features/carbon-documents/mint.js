const request = require('supertest')
const path = require('path')
const fs = require('fs')
const { algoClient, algoIndexer } = require('../../../config/algorand')
const algosdk = require('algosdk')
const { parseEntries } = require('../helpers')

describe('Mint', () => {
  const indexerClient = algoIndexer()
  const client = algoClient()
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
    const response = await request(strapi.server)
      .post(`/carbon-documents/${createdDocument.id}/mint`)
      .set('Authorization', 'Bearer ' + adminJwt)
      .expect(200)
      .expect('Content-Type', /json/)

    expect(response.body).toBeDefined()
    expect(response.body.status).toBe('minted')
    expect(response.body.developer_nft.asa_id).toBeDefined()
    createdDocument = response.body

    const mainContract = await client.getApplicationByID(Number(process.env.APP_ID)).do()
    const mainContractGlobalStateFee = parseEntries(mainContract.params['global-state'])['nft_mint_fee']
    const computedFinalFee = Math.ceil((Number(mainContractGlobalStateFee) / 100) * Number(createdDocument.credits))
    const computedFinalDeveloperCredits = Number(createdDocument.credits) - computedFinalFee
    expect(computedFinalDeveloperCredits).toBe(Number(createdDocument.developer_nft.supply))
  })
  test('Check Minted Nfts Balances', async () => {
    const developerNftHoldings = await indexerClient.lookupAssetBalances(createdDocument.developer_nft.asa_id).do()
    const feeNftHoldings = await indexerClient.lookupAssetBalances(createdDocument.fee_nft.asa_id).do()

    const checkIfDeveloperNftIsOnMainContract = () => {
      const appAddress = algosdk.getApplicationAddress(Number(process.env.APP_ID))
      const mainContractNftBalance = developerNftHoldings.balances.find((holding) => holding.address == appAddress)
      expect(mainContractNftBalance.amount).toBe(Number(createdDocument.developer_nft.supply))
    }

    const checkIfDumpIsOptedInToReceiveNftAfterCompensation = () => {
      const optedIn = 0
      const dumpAddress = algosdk.getApplicationAddress(Number(process.env.DUMP_APP_ID))
      const dumpContractNftBalance = developerNftHoldings.balances.find((holding) => holding.address == dumpAddress)
      expect(dumpContractNftBalance.amount).toBe(optedIn)
    }

    const checkIfFeeNftIsOnMainContract = () => {
      const appAddress = algosdk.getApplicationAddress(Number(process.env.APP_ID))
      const mainContractNftBalance = feeNftHoldings.balances.find((holding) => holding.address == appAddress)
      expect(mainContractNftBalance.amount).toBe(Number(createdDocument.fee_nft.supply))
    }

    checkIfDumpIsOptedInToReceiveNftAfterCompensation()
    checkIfFeeNftIsOnMainContract()
    checkIfDeveloperNftIsOnMainContract()
  })
})
