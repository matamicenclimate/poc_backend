'use strict'

const mailer = require(`${process.cwd()}/utils/mailer`)
const fileUploader = require(`${process.cwd()}/utils/upload`)

const algosdk = require('algosdk')
const crypto = require('crypto')
const { algoClient } = require(`${process.cwd()}/config/algorand`)

async function create(ctx) {
  const collectionName = ctx.originalUrl.substring(1)
  const applicationUid = strapi.api[collectionName].models[collectionName].uid
  const pushFilesResponse = await fileUploader.pushFile(ctx)
  ctx.request.body = { ...ctx.request.body, ...pushFilesResponse }

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

async function saveNft(data) {
  const nftsDb = []
  const nftsData = [
    {
      txn_type: 'assetCreation',
      metadata: data.assetNftMetadata,
      group_id: data.groupId,
      asa_id: data.supplierAsaId,
      asa_txn_id: data.assetCreationTxn,
      metadata: data.assetNftMetadata,
      carbon_document: data['carbon_document']._id,
      last_config_txn: null,
    },
    {
      txn_type: 'feeAssetCreation',
      metadata: data.climateNftMetadata,
      group_id: data.groupId,
      asa_id: data.climateFeeNftId,
      asa_txn_id: data.climateCreationTxn,
      metadata: data.climateNftMetadata,
      carbon_document: data['carbon_document']._id,
      last_config_txn: null,
    },
  ]

  for (const nft of nftsData) {
    const nftDb = await strapi.services['nfts'].create(nft)
    nftsDb.push(nftDb)
  }

  return nftsDb
}

const mintCarbonNft = async (algodclient, creator, carbonDocument) => {
  const params = await algodclient.getTransactionParams().do()
  const FEE = 0.05

  // should specify type https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0069.md
  const url = 'https://path/to/my/nft/asset/metadata.json'
  const mediaTypeSpecifier = '#p'
  const metadataUrl = `${url}${mediaTypeSpecifier}`

  // asset config
  const assetConfig = {
    unitName: 'CARBON',
    assetName: 'Carbon Document@arc69',

    total: 1, // NFTs have totalIssuance of exactly 1
    decimals: 0, // NFTs have decimals of exactly 0

    manager: undefined,
    reserve: undefined,
    freeze: undefined,
    clawback: undefined,
    defaultFrozen: false,

    suggestedParams: params,
  }

  // metadata
  const baseMetadata = {
    standard: 'arc69',
    description: `Carbon Emission Credit ${carbonDocument._id}`,
    // supongo que un hosting centralizado
    external_url: 'https://www.climatetrade.com/assets/....yoquese.pdf',
    mime_type: 'file/pdf',
    properties: {
      Serial_Number: carbonDocument.serial_number,
      Provider: carbonDocument.registry ? carbonDocument.registry._id : '',
    },
  }
  const metadata = {
    ...baseMetadata,
    properties: {
      ...baseMetadata.properties,
      Credits: carbonDocument.credits * (1 - FEE),
    },
  }
  const metadata2 = {
    ...baseMetadata,
    properties: {
      ...baseMetadata.properties,
      Credits: carbonDocument.credits * FEE,
    },
  }
  // the SHA-256 digest of the full resolution media file as a 32-byte string
  const assetMetadataHash = new Uint8Array(crypto.createHash('sha256').update(JSON.stringify(metadata)).digest())
  const assetMetadataHash2 = new Uint8Array(crypto.createHash('sha256').update(JSON.stringify(metadata2)).digest())

  const unsignedTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    ...assetConfig,
    from: creator.addr,
    assetURL: metadataUrl,
    assetMetadataHash,
    note: new TextEncoder().encode(JSON.stringify(metadata)),
  })

  const unsignedTxn2 = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    ...assetConfig,
    from: creator.addr,
    assetURL: metadataUrl,
    assetMetadataHash: assetMetadataHash2,
    note: new TextEncoder().encode(JSON.stringify(metadata2)),
  })

  // Construct TransactionWithSigner
  // Pass TransactionWithSigner to ATC
  const atc = new algosdk.AtomicTransactionComposer()
  atc.addTransaction({ txn: unsignedTxn, signer: algosdk.makeBasicAccountTransactionSigner(creator) })
  atc.addTransaction({ txn: unsignedTxn2, signer: algosdk.makeBasicAccountTransactionSigner(creator) })

  const result = await atc.execute(algodclient, 2)
  if (process.env.NODE_ENV === 'development') {
    for (const idx in result.txIDs) {
      console.log(`Transaction :   ${result.txIDs[idx]}`)
      console.log(`Transaction :   https://testnet.algoexplorer.io/tx/${result.txIDs[idx]}`)
    } // wait for transaction to be confirmed
  }

  const pendingSupplierAsaTxn = await algodclient.pendingTransactionInformation(result.txIDs[0]).do()
  const pendingFeeAsaTxn = await algodclient.pendingTransactionInformation(result.txIDs[1]).do()
  const groupId = pendingSupplierAsaTxn.txn.txn.grp.toString('base64')

  const mintData = {
    groupId: groupId,
    supplierAsaId: pendingSupplierAsaTxn['asset-index'],
    assetCreationTxn: result.txIDs[0],
    climateFeeNftId: pendingFeeAsaTxn['asset-index'],
    climateCreationTxn: result.txIDs[1],
    assetNftMetadata: metadata,
    climateNftMetadata: metadata2,
    carbon_document: carbonDocument,
  }

  await saveNft(mintData)
}

async function mint(ctx) {
  const { id } = ctx.params
  const carbonDocument = await strapi.services['carbon-documents'].findOne({ id })
  // TODO: remove status != minted. its only here for developers sake
  if (!['completed', 'minted'].includes(carbonDocument.status)) {
    return ctx.badRequest('document hasnt been reviewed')
  }

  const algodclient = algoClient()

  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)
  const nftsDb = await mintCarbonNft(algodclient, creator, carbonDocument)

  // update carbon document with nfts ids
  const carbonDocuments = await strapi.services['carbon-documents'].update(
    { id },
    {
      ...carbonDocument,
      status: 'minted',
      nfts: nftsDb,
    },
  )

  return carbonDocuments
}

module.exports = {
  create,
  mint,
}
