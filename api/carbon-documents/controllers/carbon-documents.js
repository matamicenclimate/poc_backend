'use strict'

const mailer = require(`${process.cwd()}/utils/mailer`)
const fileUploader = require(`${process.cwd()}/utils/upload`)
const algorandUtils = require(`${process.cwd()}/utils/algorand`)
const ALGORAND_ENUMS = require(`${process.cwd()}/utils/enums/algorand`)
const formatters = require(`${process.cwd()}/utils/formatters`)
const utils = require(`${process.cwd()}/utils`)

const algosdk = require('algosdk')
const { algoClient } = require(`${process.cwd()}/config/algorand`)

function formatBodyArrays(collectionTypeAtts, requestBody) {
  for (const key of collectionTypeAtts) {
    const incomingAttData = requestBody[key]
    if (incomingAttData) {
      const parsedData = JSON.parse(incomingAttData)
      requestBody[key] = formatters.mongoIdFormatter(parsedData)
    }
  }

  return requestBody
}

async function create(ctx) {
  const collectionName = ctx.originalUrl.substring(1)
  const applicationUid = strapi.api[collectionName].models[collectionName].uid
  const pushFilesResponse = await fileUploader.pushFile(ctx)
  ctx.request.body = { ...ctx.request.body, ...pushFilesResponse }
  const collectionTypeAtts = utils.getAttributesByType(
    strapi.api[collectionName].models[collectionName].attributes,
    'collection',
    'plugin',
  )

  ctx.request.body = formatBodyArrays(collectionTypeAtts, ctx.request.body)
  const createdDocument = await strapi.services[collectionName].create(ctx.request.body)
  if (process.env.NODE_ENV === 'test') {
    return createdDocument
  }

  const url = `${process.env.BASE_URL}${process.env.CONTENT_MANAGER_URL}/${applicationUid}/${createdDocument.id}`
  const mailContent = `User ${ctx.state.user.email} sent a new document.<br>Available here: ${url}`
  await mailer.send('New document', mailContent)
  return createdDocument
}

async function saveNft(data, ownerAddress) {
  const nftsDb = []
  const defaultData = {
    group_id: data.groupId,
    carbon_document: data['carbon_document']._id,
    last_config_txn: null,
  }
  const userDb = await strapi.plugins['users-permissions'].services.user.fetch({
    email: data['carbon_document'].created_by_user,
  })
  const nftsData = [
    {
      ...defaultData,
      txn_type: ALGORAND_ENUMS.TXN_TYPES.ASSET_CREATION,
      metadata: data.assetNftMetadata,
      asa_id: data.supplierAsaId,
      asa_txn_id: data.assetCreationTxn,
      owner_address: userDb.publicAddress,
    },
    {
      ...defaultData,
      txn_type: ALGORAND_ENUMS.TXN_TYPES.FEE_ASSET_CREATION,
      metadata: data.climateNftMetadata,
      asa_id: data.climateFeeNftId,
      asa_txn_id: data.climateCreationTxn,
      owner_address: ownerAddress,
    },
  ]

  for (const nft of nftsData) {
    const nftDb = await strapi.services['nfts'].create(nft)
    nftsDb.push(nftDb)
  }

  return nftsDb
}

function getBaseMetadata(carbonDocument, options = {}) {
  const mintDefaults = ALGORAND_ENUMS.MINT_DEFAULTS
  const fee = ALGORAND_ENUMS.FEES.FEE
  if (!carbonDocument || !options.txType) {
    return
  }

  return {
    standard: options.standard ?? ALGORAND_ENUMS.ARCS.ARC69,
    description: options.description ?? `${mintDefaults.METADATA_DESCRIPTION} ${carbonDocument._id}`,
    external_url: options.external_url ?? mintDefaults.EXTERNAL_URL,
    mime_type: options.mime_type ?? ALGORAND_ENUMS.MINT_MIME_TYPES.PDF,
    properties: {
      Serial_Number: carbonDocument.serial_number ?? null,
      Provider: carbonDocument.registry._id ?? '',
      Credits:
        options.txType === ALGORAND_ENUMS.TXN_TYPES.FEE_ASSET_CREATION
          ? carbonDocument.credits * fee
          : carbonDocument.credits * (1 - fee),
    },
  }
}

/**
 *
 * @param {algosdk.Algodv2} algodclient
 * @param {*} creator
 * @param {*} carbonDocument
 * @returns
 */
const mintCarbonNft = async (algodclient, creator, carbonDocument) => {
  // should specify type https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0069.md
  const metadataUrl = `${ALGORAND_ENUMS.MINT_DEFAULTS.ASSET_URL}${ALGORAND_ENUMS.MINT_DEFAULTS.MEDIA_TYPE_SPECIFIER}`

  // asset config
  const assetOptions = algorandUtils.getAssetOptions(creator)
  const assetConfig = await algorandUtils.getAssetConfig(algodclient, ALGORAND_ENUMS.DEFAULT, assetOptions)
  const assetMetadata = getBaseMetadata(carbonDocument, { txType: ALGORAND_ENUMS.TXN_TYPES.ASSET_CREATION })
  const feeAssetMetadata = getBaseMetadata(carbonDocument, { txType: ALGORAND_ENUMS.TXN_TYPES.FEE_ASSET_CREATION })
  // the SHA-256 digest of the full resolution media file as a 32-byte string
  const assetMetadataHash = algorandUtils.getHashedMetadata(assetMetadata)
  const feeAssetMetadataHash = algorandUtils.getHashedMetadata(feeAssetMetadata)

  const unsignedTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    ...assetConfig,
    from: creator.addr,
    assetURL: metadataUrl,
    assetMetadataHash,
    note: algorandUtils.encodeMetadataText(assetMetadata),
  })

  const unsignedTxn2 = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    ...assetConfig,
    from: creator.addr,
    assetURL: metadataUrl,
    assetMetadataHash: feeAssetMetadataHash,
    note: algorandUtils.encodeMetadataText(feeAssetMetadata),
  })

  // Construct TransactionWithSigner
  // Pass TransactionWithSigner to ATC
  const atc = new algosdk.AtomicTransactionComposer()
  atc.addTransaction({ txn: unsignedTxn, signer: algosdk.makeBasicAccountTransactionSigner(creator) })
  atc.addTransaction({ txn: unsignedTxn2, signer: algosdk.makeBasicAccountTransactionSigner(creator) })

  const result = await atc.execute(algodclient, 2)
  if (process.env.NODE_ENV === 'development') {
    for (const idx in result.txIDs) {
      strapi.log.info(`Transaction:   https://testnet.algoexplorer.io/tx/${result.txIDs[idx]}`)
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
    assetNftMetadata: assetMetadata,
    climateNftMetadata: feeAssetMetadata,
    carbon_document: carbonDocument,
  }

  await saveNft(mintData, creator.addr)
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
