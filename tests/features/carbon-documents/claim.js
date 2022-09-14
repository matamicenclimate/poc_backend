const request = require('supertest')
const path = require('path')
const fs = require('fs')
const { algoClient, algoIndexer } = require('../../../config/algorand')
const algosdk = require('algosdk')
const { getEscrowFromApp } = require('../../../utils/algorand')
const userWallet = require('../helpers/wallet')

describe('Claim NFT', () => {
  const indexerClient = algoIndexer()
  const client = algoClient()
  test('Optin to Project NFT', async () => {
    const userAccount = algosdk.mnemonicToSecretKey(userWallet.user.nemonic)
    const sp = await client.getTransactionParams().do()
    const optinTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: userWallet.user.wallet,
      assetIndex: Number(createdDocument.developer_nft.asa_id),
      to: userWallet.user.wallet,
      amount: 0,
      suggestedParams: sp,
    })

    const rawSignedTxn = optinTxn.signTxn(userAccount.sk)
    const opttx = await client.sendRawTransaction(rawSignedTxn).do()
    await algosdk.waitForConfirmation(client, opttx.txId, 4)

    const holdings = await indexerClient.lookupAssetBalances(createdDocument.developer_nft.asa_id).do()
    const userAdd = userWallet.user.wallet
    const isUserWalletHolding = (holding) => holding.address == userAdd
    const mainContractNftBalance = holdings.balances.filter(isUserWalletHolding)
    const optedIn = 0

    expect(mainContractNftBalance.length).toBe(1)
    expect(mainContractNftBalance[0].amount).toBe(optedIn)
  })
  test('User claims NFT', async () => {
    const response = await request(strapi.server)
      .post(`/carbon-documents/${createdDocument.id}/claim`)
      .set('Authorization', 'Bearer ' + jwt)
      .expect(200)
    expect(response.body).toBeDefined()
    expect(response.body.status).toBe('claimed')
    createdDocument = response.body

    const holdings = await indexerClient.lookupAssetBalances(createdDocument.developer_nft.asa_id).do()

    const userAddress = userWallet.user.wallet
    const userNftBalance = holdings.balances.find((holding) => holding.address == userAddress)

    const appAddress = algosdk.getApplicationAddress(Number(process.env.APP_ID))
    const mainContractNftBalance = holdings.balances.find((holding) => holding.address == appAddress)

    const nftClaimedByUser = 0
    expect(mainContractNftBalance.amount).toBe(nftClaimedByUser)
    expect(userNftBalance.amount).toBe(Number(createdDocument.developer_nft.supply))
  })
})
