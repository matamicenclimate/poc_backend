'use strict'

const mailer = require(`${process.cwd()}/utils/mailer`)
const fileUploader = require(`${process.cwd()}/utils/upload`)

const algosdk = require('algosdk')
const crypto = require('crypto')
const { algoClient } = require(`${process.cwd()}/config/algorand`)

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

// Function used to wait for a tx confirmation
async function waitForConfirmation(algodclient, txId) {
  let response = await algodclient.status().do()
  let lastround = response['last-round']
  while (true) {
    const pendingInfo = await algodclient.pendingTransactionInformation(txId).do()
    if (pendingInfo['confirmed-round'] !== null && pendingInfo['confirmed-round'] > 0) {
      // Got the completed Transaction
      console.log('Transaction ' + txId + ' confirmed in round ' + pendingInfo['confirmed-round'])
      break
    }
    lastround++
    await algodclient.statusAfterBlock(lastround).do()
  }
}

const mintCarbonNft = async (algodclient, creator, carbonDocument) => {
  const params = await algodclient.getTransactionParams().do()

  // TODO:
  const unitName = 'CARBON'
  const assetName = 'Carbon Document@arc69'

  // should specify type https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0069.md
  const url = 'https://path/to/my/nft/asset/metadata.json'
  const mediaTypeSpecifier = '#p'
  const metadataUrl = `${url}${mediaTypeSpecifier}`

  // asset config
  const managerAddr = undefined
  const reserveAddr = undefined
  const freezeAddr = undefined
  const clawbackAddr = undefined
  const defaultFrozen = false
  const total = 1 // NFTs have totalIssuance of exactly 1
  const decimals = 0 // NFTs have decimals of exactly 0

  // metadata
  const metadata = {
    standard: 'arc69',
    description: `Carbon Emission Credit ${carbonDocument._id}`,
    // supongo que un hosting centralizado
    external_url: 'https://www.climatetrade.com/assets/....yoquese.pdf',
    mime_type: 'file/pdf',
    properties: {
      Credits: carbonDocument.credits,
      Serial_Number: carbonDocument.serial_number,
      Provider: carbonDocument.registry ? carbonDocument.registry._id : '',
    },
  }
  // the SHA-256 digest of the full resolution media file as a 32-byte string
  const hash = crypto.createHash('sha256').update(JSON.stringify(metadata))
  const assetMetadataHash = new Uint8Array(hash.digest())

  const unsignedTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: creator.addr,
    total,
    decimals,
    assetName,
    unitName,
    assetURL: metadataUrl,
    assetMetadataHash,
    defaultFrozen,
    freeze: freezeAddr,
    manager: managerAddr,
    clawback: clawbackAddr,
    reserve: reserveAddr,
    suggestedParams: params,
    note: new TextEncoder().encode(JSON.stringify(metadata)),
  })

  // create and send the configurationTxn
  const signedTxn = unsignedTxn.signTxn(creator.sk)
  const txn = await algodclient.sendRawTransaction(signedTxn).do()
  console.log(`Transaction :   https://testnet.algoexplorer.io/tx/${txn.txId}`)

  // wait for transaction to be confirmed
  await waitForConfirmation(algodclient, txn.txId)
  // Get the new asset's information from the creator account
  const ptx = await algodclient.pendingTransactionInformation(txn.txId).do()
  const assetID = ptx['asset-index']
  return assetID
}

async function mint(ctx) {
  const { id } = ctx.params
  const carbonDocument = await strapi.services['carbon-documents'].findOne({ id })
  if (carbonDocument.status === 'testerino') {
    return ctx.badRequest('document hasnt been reviewed')
    // return (ctx.status = 500, ctx.message = 'error 500')
  }

  const algodclient = algoClient()
  // console.log(await algodclient.status().do())
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)
  const mintedNftId = await mintCarbonNft(algodclient, creator, carbonDocument)

  // update carbon document with nfts ids
  const carbonDocuments = await strapi.services['carbon-documents'].update(
    { id },
    {
      ...carbonDocument,
      status: 'minted',
      minted_block_id: '',
      minted_supplier_asa_id: mintedNftId,
      minted_climate_asa_id: 0,
    },
  )

  return carbonDocuments
}

module.exports = {
  create,
  mint,
}
