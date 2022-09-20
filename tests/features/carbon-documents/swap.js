const request = require('supertest')
const path = require('path')
const fs = require('fs')
const { algoClient, algoIndexer } = require('../../../config/algorand')
const algosdk = require('algosdk')
const { getEscrowFromApp } = require('../../../utils/algorand')
const userWallet = require('../helpers/wallet')
const { signEncodedTransactions } = require('../helpers')

describe('Swap NFT', () => {
  const indexerClient = algoIndexer()
  const client = algoClient()
  let climatecoinBalanceBeforeSwap
  beforeAll(async () => {
    const userAddress = userWallet.user.wallet
    const userClimatecoinHoldings = await indexerClient
      .lookupAccountAssets(userAddress)
      .assetId(Number(process.env.CLIMATECOIN_ASA_ID))
      .do()
    if (userClimatecoinHoldings?.assets?.length === 0) {
      climatecoinBalanceBeforeSwap = 0
    } else {
      climatecoinBalanceBeforeSwap = userClimatecoinHoldings?.assets[0].amount
    }
  })
  test('User swaps NFT', async () => {
    const prepareSwapResponse = await request(strapi.server)
      .get(`/carbon-documents/${createdDocument.id}/swap/prepare`)
      .set('Authorization', 'Bearer ' + jwt)
      .expect(200)
    expect(prepareSwapResponse.body).toBeDefined()

    const signedTxn = signEncodedTransactions(prepareSwapResponse.body)

    const swapResponse = await request(strapi.server)
      .post(`/carbon-documents/${createdDocument.id}/swap`)
      .set('Authorization', 'Bearer ' + jwt)
      .send({ signedTxn })
      .expect(200)
    expect(swapResponse.body).toBeDefined()
    expect(swapResponse.body.status).toBe('swapped')
    createdDocument = swapResponse.body
  })
  test('Holdings after swap', async () => {
    const nftHoldings = await indexerClient.lookupAssetBalances(createdDocument.developer_nft.asa_id).do()

    const userAddress = userWallet.user.wallet
    const userNftBalance = nftHoldings.balances.find((holding) => holding.address == userAddress)

    const appAddress = algosdk.getApplicationAddress(Number(process.env.APP_ID))
    const mainContractNftBalance = nftHoldings.balances.find((holding) => holding.address == appAddress)

    const nftSwapped = 0
    expect(mainContractNftBalance.amount).toBe(Number(createdDocument.developer_nft.supply))
    expect(userNftBalance.amount).toBe(nftSwapped)

    const userClimatecoinHoldings = await indexerClient
      .lookupAccountAssets(userAddress)
      .assetId(Number(process.env.CLIMATECOIN_ASA_ID))
      .do()
    expect(userClimatecoinHoldings?.assets[0].amount).toBe(
      climatecoinBalanceBeforeSwap + Number(createdDocument.developer_nft.supply),
    )
  })
})
