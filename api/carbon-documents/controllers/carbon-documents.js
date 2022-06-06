'use strict'

const mailer = require(`${process.cwd()}/utils/mailer`)
const fileUploader = require(`${process.cwd()}/utils/upload`)
const algorandUtils = require(`${process.cwd()}/utils/algorand`)
const ALGORAND_ENUMS = require(`${process.cwd()}/utils/enums/algorand`)
const formatters = require(`${process.cwd()}/utils/formatters`)
const utils = require(`${process.cwd()}/utils`)
const algosdk = require('algosdk')
const { algoClient, algoIndexer } = require(`${process.cwd()}/config/algorand`)
const { getEscrowFromApp } = require('../../../utils/algorand')

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
      nft_type: ALGORAND_ENUMS.NFT_TYPES.DEVELOPER,
      metadata: data.assetNftMetadata,
      asa_id: data.developerAsaId,
      asa_txn_id: data.txn,
      owner_address: userDb.publicAddress,
      supply: data.developerSupply,
    },
    {
      ...defaultData,
      nft_type: ALGORAND_ENUMS.NFT_TYPES.FEE,
      metadata: data.assetNftMetadata,
      asa_id: data.climateFeeNftId,
      asa_txn_id: data.txn,
      owner_address: ownerAddress,
      supply: data.feeSupply,
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
  if (!carbonDocument || !options.txType) {
    return
  }

  let sdgs = []
  carbonDocument.sdgs.forEach((sdg) => {
    sdgs.push(sdg.name)
  })

  return {
    standard: options.standard ?? ALGORAND_ENUMS.ARCS.ARC69,
    description: options.description ?? `${mintDefaults.METADATA_DESCRIPTION} ${carbonDocument._id}`,
    external_url: options.external_url ?? mintDefaults.EXTERNAL_URL,
    mime_type: options.mime_type ?? ALGORAND_ENUMS.MINT_MIME_TYPES.PDF,
    properties: {
      // project_type: carbonDocument.project_type.name,
      // country: carbonDocument.country.name,
      // sdgs: sdgs.join(',') ?? '',
      title: carbonDocument.title,
      // description: carbonDocument.description,
      // project_url: carbonDocument.project_url,
      // latitude: carbonDocument.project_latitude ?? '',
      // longitude: carbonDocument.project_longitude ?? '',
      credits: carbonDocument.credits,
      serial_number: carbonDocument.serial_number,
      // project_registration: carbonDocument.project_registration,
      // credit_start: carbonDocument.credit_start,
      // credit_end: carbonDocument.credit_end,
      // type: carbonDocument.type.name,
      // subtype: carbonDocument.sub_type.name,
      // methodology: carbonDocument.methodology.name ?? '',
      // validator: carbonDocument.validator.name ?? '',
      // first_verifier: carbonDocument.first_verifier.name ?? '',
      // standard: carbonDocument.standard.name,
      registry: carbonDocument.registry.name,
      // registry_url: carbonDocument.registry_url,
      id: carbonDocument._id,
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
  const atc = new algosdk.AtomicTransactionComposer()
  const indexerClient = algoIndexer()

  const suggestedParams = await algodclient.getTransactionParams().do()
  const assetMetadata = getBaseMetadata(carbonDocument, { txType: ALGORAND_ENUMS.NFT_TYPES.DEVELOPER })

  atc.addMethodCall({
    appID: Number(process.env.APP_ID),
    method: algorandUtils.getMethodByName('create_nft'),
    sender: creator.addr,
    signer: algosdk.makeBasicAccountTransactionSigner(creator),
    suggestedParams,
    note: algorandUtils.encodeMetadataText(assetMetadata),
    methodArgs: [
      Number(carbonDocument.credits),
      Number(process.env.DUMP_APP_ID),
      getEscrowFromApp(Number(process.env.DUMP_APP_ID)),
    ],
  })

  try {
    const result = await atc.execute(algodclient, 2)
    const transactionId = result.txIDs[0]
    const transactionInfo = await indexerClient.searchForTransactions().address(creator.addr).txid(transactionId).do()
    const txnsCfg = transactionInfo.transactions[0]['inner-txns'].filter(
      (transaction) => transaction['tx-type'] === 'acfg',
    )

    const feeAsaTxn = txnsCfg[0]
    const developerAsaTxn = txnsCfg[1]
    const mintData = {
      groupId: developerAsaTxn.group,
      developerAsaId: developerAsaTxn['created-asset-index'],
      txn: transactionId,
      climateFeeNftId: feeAsaTxn['created-asset-index'],
      assetNftMetadata: assetMetadata,
      carbon_document: carbonDocument,
      developerSupply: developerAsaTxn['asset-config-transaction'].params.total,
      feeSupply: feeAsaTxn['asset-config-transaction'].params.total,
    }

    return await saveNft(mintData, creator.addr)
  } catch (error) {
    throw strapi.errors.badRequest(error)
  }
}

async function mint(ctx) {
  const { id } = ctx.params
  const carbonDocument = await strapi.services['carbon-documents'].findOne({ id })
  if (!['completed'].includes(carbonDocument.status)) {
    return ctx.badRequest("Document hasn't been reviewed")
  }

  const algodclient = algoClient()

  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  try {
    const nftsDb = await mintCarbonNft(algodclient, creator, carbonDocument)

    // update carbon document with nfts ids
    const carbonDocuments = await strapi.services['carbon-documents'].update(
      { id },
      {
        ...carbonDocument,
        status: 'minted',
        developer_nft: nftsDb[0],
        fee_nft: nftsDb[1],
      },
    )
    return carbonDocuments
  } catch (error) {
    strapi.log.error(error)
    return { status: error.status, message: error.message }
  }
}

async function claim(ctx) {
  const { id } = ctx.params
  const carbonDocument = await strapi.services['carbon-documents'].findOne({ id })
  if (!['minted'].includes(carbonDocument.status)) {
    return ctx.badRequest("Document hasn't been minted")
  }

  const algodclient = algoClient()
  const indexerClient = algoIndexer()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  const userDb = await strapi.plugins['users-permissions'].services.user.fetch({
    email: carbonDocument.created_by_user,
  })
  const developerPublicAddress = userDb.publicAddress

  const developerNft = carbonDocument.developer_nft
  const assetId = Number(developerNft.asa_id)

  await claimNft(algodclient, indexerClient, creator, assetId, developerPublicAddress)

  const updatedCarbonDocument = await strapi.services['carbon-documents'].update(
    { id: carbonDocument },
    { status: 'claimed' },
  )
  await strapi.services.nfts.update({ id: updatedCarbonDocument.developer_nft.id }, { status: 'claimed' })

  return updatedCarbonDocument
}

async function claimNft(algodclient, indexerClient, creator, assetId, developerPublicAddress) {
  const atc = new algosdk.AtomicTransactionComposer()

  const assetInfo = await indexerClient.searchForAssets().index(assetId).do()
  const total = assetInfo.assets[0].params.total

  const suggestedParams = await algodclient.getTransactionParams().do()
  atc.addMethodCall({
    appID: Number(process.env.APP_ID),
    method: algorandUtils.getMethodByName('move'),
    sender: creator.addr,
    signer: algosdk.makeBasicAccountTransactionSigner(creator),
    suggestedParams,
    methodArgs: [
      Number(assetId),
      algorandUtils.getEscrowFromApp(Number(process.env.APP_ID)),
      developerPublicAddress,
      total,
    ],
  })

  const result = await atc.execute(algodclient, 2)

  return result
}

async function swap(ctx) {
  const { id } = ctx.params
  const { txnId, isGroup, groupId } = ctx.request.body
  const carbonDocument = await strapi.services['carbon-documents'].findOne({ id })
  if (!['claimed'].includes(carbonDocument.status)) {
    return ctx.badRequest("Document hasn't been claimed")
  }

  const updatedCarbonDocument = await strapi.services['carbon-documents'].update({ id }, { status: 'swapped' })
  await updateActivity(updatedCarbonDocument.developer_nft.id, txnId, isGroup, groupId)

  await strapi.services.nfts.update({ id: updatedCarbonDocument.developer_nft.id }, { status: 'swapped' })

  return updatedCarbonDocument
}

async function updateActivity(nft, txn_id, is_group, group_id) {
  return await strapi.services.activities.update({ nft, type: 'swap' }, { txn_id, is_group, group_id })
}

module.exports = {
  create,
  mint,
  claim,
  swap,
}
