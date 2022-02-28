'use strict'

const mailer = require(`${process.cwd()}/utils/mailer`)
const fileUploader = require(`${process.cwd()}/utils/upload`)

const algosdk = require('algosdk')
const { algoclient } = require(`${process.cwd()}/config/algorand`)

async function create(ctx) {
  const collectionName = ctx.originalUrl.substring(1)
  const applicationUid = strapi.api[collectionName].models[collectionName].uid
  const pushFileResponse = await fileUploader.pushFile(ctx)
  if (pushFileResponse[0]) {
    strapi.log.info(`[${pushFileResponse[0].url}] file uploaded`)
    ctx.request.body.document = pushFileResponse[0].id
  }

  const createdDocument = await strapi.services[collectionName].create(ctx.request.body)
  if (process.env.NODE_ENV === 'test') {
    return createdDocument
  }

  const url = `${process.env.BASE_URL}${process.env.CONTENT_MANAGER_URL}/${applicationUid}/${createdDocument.id}`
  const mailContent = `User ${ctx.state.user.email} sent a new document.<br>Available here: ${url}`
  await mailer.send('New document', mailContent)
  return createdDocument
}
async function mint(ctx) {
  ctx.send(ctx.state.user)
}

async function mint() {
  console.log(await algoclient.status().do())
  const params = await algoclient.getTransactionParams().do()
  const creator = ''
  const defaultFrozen = false
  const unitName = 'ALICEART'
  const assetName = "Alice's Artwork@arc3"
  const url = 'https://path/to/my/nft/asset/metadata.json'
  // Optional hash commitment of some sort relating to the asset. 96 character length.
  const assetMetadataHash = '16efaa3924a6fd9d3a4824799a4ac65d'
  const managerAddr = undefined
  const reserveAddr = undefined
  const freezeAddr = undefined
  const clawbackAddr = undefined
  const total = 1 // NFTs have totalIssuance of exactly 1
  const decimals = 0 // NFTs have decimals of exactly 0
  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: creator,
    total,
    decimals,
    assetName,
    unitName,
    assetURL: url,
    assetMetadataHash,
    defaultFrozen,
    freeze: freezeAddr,
    manager: managerAddr,
    clawback: clawbackAddr,
    reserve: reserveAddr,
    suggestedParams: params,
  })
  let rawSignedTxn = txn.signTxn(recoveredAccount1.sk)
  let tx = await algoclient.sendRawTransaction(rawSignedTxn).do()
  console.log('Transaction : ' + tx.txId)
  let assetID = null
  // wait for transaction to be confirmed
  await waitForConfirmation(algoclient, tx.txId)
  // Get the new asset's information from the creator account
  let ptx = await algoclient.pendingTransactionInformation(tx.txId).do()
  assetID = ptx['asset-index']
}

module.exports = {
  create,
  mint,
}
