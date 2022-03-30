'use strict'

const algosdk = require('algosdk')
const { algoClient, algoIndexer } = require(`${process.cwd()}/config/algorand`)
const algorandUtils = require(`${process.cwd()}/utils/algorand`)

async function claim(ctx) {
  const algodclient = algoClient()
  const indexerClient = algoIndexer()
  const atc = new algosdk.AtomicTransactionComposer()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  const { carbonDocument, email } = ctx.request.body
  const carbonDocumentData = await strapi.services['carbon-documents'].findOne({ id: carbonDocument })
  const developerNft = carbonDocumentData.developer_nft
  const assetId = Number(developerNft.asa_id)
  const assetInfo = await indexerClient.searchForAssets().index(assetId).do()
  const total = assetInfo.assets[0].params.total

  const userDb = await strapi.plugins['users-permissions'].services.user.fetch({
    email,
  })
  const userPublicAddress = userDb.publicAddress

  const suggestedParams = await algodclient.getTransactionParams().do()
  atc.addMethodCall({
    appID: Number(process.env.APP_ID),
    method: algorandUtils.getMethodByName('move'),
    sender: creator.addr,
    signer: algosdk.makeBasicAccountTransactionSigner(creator),
    suggestedParams,
    methodArgs: [Number(assetId), algorandUtils.getEscrowFromApp(Number(process.env.APP_ID)), userPublicAddress, total],
  })

  const result = await atc.execute(algodclient, 2)

  await strapi.services['carbon-documents'].update({ id: carbonDocument }, { status: 'claimed' })

  return result
}

module.exports = {
  claim,
}
