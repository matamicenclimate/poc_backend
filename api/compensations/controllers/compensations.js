'use strict'

const algosdk = require('algosdk')

const { algoClient } = require(`${process.cwd()}/config/algorand`)
const algorandUtils = require(`${process.cwd()}/utils/algorand`)
const ALGORAND_ENUMS = require('../../../utils/enums/algorand')
const { readFileFromUploads, getFileFromS3 } = require('../../../utils/upload')

const { createPDF, generateCompensationPDF } = require('../../../utils/pdf')
const { uploadFileToIPFS } = require('../../../utils/ipfs')
const { parseMultipartData, sanitizeEntity } = require('strapi-utils')
const { algoIndexer } = require('../../../config/algorand')
const { burn } = require('../../nfts/controllers/nfts')
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

async function findOne(ctx) {
  const { id } = ctx.params
  const user = ctx.state.user
  const compensation = await strapi.services.compensations.findOne({ id })

  if (!compensation || compensation.id !== id) return ctx.badRequest('Not found')
  if (compensation.user.id !== user.id) return ctx.unauthorized()

  return compensation
}

async function calculate(ctx) {
  const { amount } = ctx.request.query
  const user = ctx.state.user

  const nftsToBurn = await getNFTsToBurn(Number(amount))
  if (!nftsToBurn.length) {
    throw new Error('There are no nfts to burn')
  }
  for (const nftBurning of nftsToBurn) {
    await strapi.services.nfts.update(
      { id: nftBurning.id },
      { burnWillTimeoutOn: Date.now() + 60000 * process.env.MAX_MINUTES_TO_BURN },
    )
  }
  const algodclient = algoClient()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)
  const suggestedParams = await algodclient.getTransactionParams().do()

  const assetsToCompensateFrom = nftsToBurn.map((item) => Number(item.asa_id))
  const nftIds = nftsToBurn.map((item) => item.id)

  const climatecoinTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: user.publicAddress,
    assetIndex: Number(process.env.CLIMATECOIN_ASA_ID),
    to: algosdk.getApplicationAddress(Number(process.env.APP_ID)),
    amount: Number(amount),
    suggestedParams,
  })

  const requiredFundsPaymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: creator.addr,
    to: algosdk.getApplicationAddress(Number(process.env.APP_ID)),
    amount: algosdk.algosToMicroalgos((2 + assetsToCompensateFrom.length) * 0.1),
    suggestedParams: suggestedParams,
  })

  const burnParametersTxn = algosdk.makeApplicationCallTxnFromObject({
    from: creator.addr,
    appIndex: Number(process.env.APP_ID),
    // the atc appends the assets to the foreignAssets and passes the index of the asses in the appArgs
    appArgs: [algorandUtils.getMethodByName('burn_parameters').getSelector()],
    foreignApps: [Number(process.env.DUMP_APP_ID)],
    foreignAssets: assetsToCompensateFrom,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  const burnTxn = algosdk.makeApplicationCallTxnFromObject({
    from: user.publicAddress,
    appIndex: Number(process.env.APP_ID),
    appArgs: [algorandUtils.getMethodByName('burn_climatecoins').getSelector()],
    foreignAssets: [...assetsToCompensateFrom, Number(process.env.CLIMATECOIN_ASA_ID)],
    accounts: [algosdk.getApplicationAddress(Number(process.env.DUMP_APP_ID))],
    foreignApps: [Number(process.env.DUMP_APP_ID)],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  burnTxn.fee += (5 + 4 * assetsToCompensateFrom.length) * algosdk.ALGORAND_MIN_TX_FEE

  const burnGroupTxn = [climatecoinTransferTxn, requiredFundsPaymentTxn, burnParametersTxn, burnTxn]
  const [transfer, funds, params, burn] = algosdk.assignGroupID(burnGroupTxn)

  const encodedTransferTxn = algosdk.encodeUnsignedTransaction(transfer)
  const encodedBurnTxn = algosdk.encodeUnsignedTransaction(burn)

  const signedFundsTxn = await funds.signTxn(creator.sk)
  const signedParamsTxn = await params.signTxn(creator.sk)

  return {
    amount: Number(amount),
    assets: assetsToCompensateFrom,
    nftIds,
    signedParamsTxn,
    signedFundsTxn,
    encodedTransferTxn,
    encodedBurnTxn,
  }
}

async function create(ctx) {
  const { signedTxn, ...compensationData } = ctx.request.body
  const user = ctx.state.user

  if (!signedTxn) ctx.reject('Txn is missing in request body')

  const algodClient = algoClient()
  const txnBlob = [
    Buffer.from(Object.values(signedTxn[0])),
    Buffer.from(signedTxn[1].data),
    Buffer.from(signedTxn[2].data),
    Buffer.from(Object.values(signedTxn[3])),
  ]
  const { txId } = await algodClient.sendRawTransaction(txnBlob).do()
  const result = await algosdk.waitForConfirmation(algodClient, txId, 4)

  const indexerClient = algoIndexer()
  const groupId = Buffer.from(result.txn.txn.grp).toString('base64')
  const block = await indexerClient.lookupBlock(result['confirmed-round']).do()

  const grpTxns = block.transactions.filter((transaction) => transaction?.group === groupId)
  const appCreatorTxn = grpTxns.filter(
    (transaction) =>
      transaction.hasOwnProperty('inner-txns') &&
      transaction['inner-txns'][0].hasOwnProperty('created-application-index'),
  )

  const burnContractId = appCreatorTxn[0]['inner-txns'][0]['created-application-index']

  const newCompensation = { ...compensationData, txn_id: groupId, user: user.id, contract_id: burnContractId }

  const newDocument = await strapi.services.compensations.create(newCompensation)
  return sanitizeEntity(newDocument, { model: strapi.models.compensations })
}

async function prepareClaimCertificate(ctx) {
  const { id } = ctx.params
  const user = ctx.state.user
  // TODO Use indexer to has updated fields
  const compensation = await strapi.services['compensations'].findOne({ id })

  if (compensation.user.id !== user.id) return ctx.unauthorized()
  if (compensation.compensation_nft === undefined) throw new Error('Compensation NFT not minted yet')

  const algodclient = algoClient()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)
  const suggestedParams = await algodclient.getTransactionParams().do()

  // TODO Use indexer to has updated fields
  const compensationNft = await strapi.services.nfts.findOne({ id: compensation.compensation_nft })
  const nftsToBurn = compensation.nfts.map((nft) => Number(nft.asa_id))

  const compensationNftOptinTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: user.publicAddress,
    assetIndex: Number(compensationNft.asa_id),
    to: user.publicAddress,
    amount: Number(0),
    suggestedParams,
  })

  const approveBurnTxn = algosdk.makeApplicationCallTxnFromObject({
    from: creator.addr,
    appIndex: Number(process.env.APP_ID),
    appArgs: [
      algorandUtils.getMethodByName('approve_burn').getSelector(),
      algosdk.encodeUint64(1),
      algosdk.encodeUint64(0),
    ],
    foreignAssets: [Number(compensationNft.asa_id), ...nftsToBurn, Number(process.env.CLIMATECOIN_ASA_ID)],
    accounts: [algosdk.getApplicationAddress(Number(process.env.DUMP_APP_ID)), user.publicAddress],
    foreignApps: [Number(compensation.contract_id), Number(process.env.DUMP_APP_ID)],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  approveBurnTxn.fee += (6 + nftsToBurn.length) * algosdk.ALGORAND_MIN_TX_FEE

  const compensationClaimGroupTxn = [compensationNftOptinTxn, approveBurnTxn]
  const [optin, approve] = algosdk.assignGroupID(compensationClaimGroupTxn)

  const encodedOptinTxn = algosdk.encodeUnsignedTransaction(optin)
  const signedApproveTxn = await approve.signTxn(creator.sk)

  return {
    compensationId: id,
    encodedOptinTxn,
    signedApproveTxn,
  }
}

async function claimCertificate(ctx) {
  const { id } = ctx.params
  const { signedTxn } = ctx.request.body
  const user = ctx.state.user
  // TODO Use indexer to has updated fields
  const compensation = await strapi.services.compensations.findOne({ id })

  if (!signedTxn) throw new Error('Txn is missing in request body')
  if (compensation.user.id !== user.id) return ctx.unauthorized()

  const algodClient = algoClient()
  const txnBlob = [Buffer.from(Object.values(signedTxn[0])), Buffer.from(signedTxn[1].data)]
  const { txId } = await algodClient.sendRawTransaction(txnBlob).do()
  await algosdk.waitForConfirmation(algodClient, txId, 4)

  await strapi.services.nfts.update({ id: compensation.compensation_nft.id }, { status: 'claimed' })
  const compensationUpdated = await strapi.services.compensations.update({ id }, { state: 'claimed' })

  return sanitizeEntity(compensationUpdated, { model: strapi.models.compensations })
}

async function me(ctx) {
  const user = ctx.state.user.id
  // TODO Use indexer to has updated fields
  const activities = await strapi.services.compensations.find({ user: user, ...ctx.query })

  return activities
}

async function mint(ctx) {
  const { id } = ctx.params
  // TODO Use indexer to has updated fields
  const compensation = await strapi.services['compensations'].findOne({ id })
  if (!['received_certificates'].includes(compensation.state)) {
    return ctx.badRequest("Compensation hasn't been reviewed")
  }
  const ipfsCIDs = await uploadFilesToIPFS(compensation)
  const algodclient = algoClient()

  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  try {
    const filePath = `${compensation.id}.pdf`
    const html = generateCompensationPDF(ipfsCIDs, compensation)
    const consolidationPdfBuffer = await createPDF(html, filePath)

    // const pdfBuffer = await readFileFromUploads(filePath)
    const consolidationPdfCid = await uploadFileToIPFS(consolidationPdfBuffer, 'application/pdf')

    const compensationNftId = await algoFn.mintCompensationNft(algodclient, creator, compensation, consolidationPdfCid)

    const updatedCompensation = await strapi.services['compensations'].update(
      { id },
      {
        ...compensation,
        state: 'minted',
        compensation_nft: compensationNftId,
        consolidation_certificate_ipfs_cid: consolidationPdfCid,
      },
    )

    return updatedCompensation
  } catch (error) {
    console.log(error.message, error.stack)

    strapi.log.error(error)
    return { status: error.status, message: error.message }
  }
}

const algoFn = {
  mintCompensationNft: async (algodclient, creator, compensationDocument, ipfsUrl) => {
    const atc = new algosdk.AtomicTransactionComposer()

    const suggestedParams = await algodclient.getTransactionParams().do()
    const assetMetadata = {
      standard: ALGORAND_ENUMS.ARCS.ARC69,
      description: `${ALGORAND_ENUMS.MINT_DEFAULTS.COMPENSATION_NFT.METADATA_DESCRIPTION}`,
      external_url: `ipfs://${ipfsUrl}#p`,
      mime_type: ALGORAND_ENUMS.MINT_MIME_TYPES.PDF,
      properties: {
        Reference: compensationDocument._id,
        Amount: compensationDocument.amount,
      },
    }

    atc.addMethodCall({
      appID: Number(process.env.APP_ID),
      method: algorandUtils.getMethodByName('mint_compensation_nft'),
      sender: creator.addr,
      signer: algosdk.makeBasicAccountTransactionSigner(creator),
      suggestedParams,
      note: algorandUtils.encodeMetadataText(assetMetadata),
    })

    try {
      const result = await atc.execute(algodclient, 2)
      const mintedNftId = result.methodResults[0].returnValue
      const mintedTxnId = result.methodResults[0].txID

      const nftDb = await strapi.services.nfts.create({
        group_id: mintedTxnId,
        // carbon_document: data['carbon_document']._id,
        last_config_txn: null,
        nft_type: ALGORAND_ENUMS.NFT_TYPES.COMPENSATION,
        metadata: assetMetadata,
        asa_id: mintedNftId,
        asa_txn_id: mintedTxnId,
        owner_address: compensationDocument.user.publicAddress,
        supply: 1,
      })

      return nftDb.id
    } catch (error) {
      throw strapi.errors.badRequest(error)
    }
  },
}
module.exports = {
  me,
  calculate,
  mint,
  algoFn,
  create,
  prepareClaimCertificate,
  claimCertificate,
  findOne,
}

async function getNFTsToBurn(amount) {
  // TODO Use indexer to has updated fields
  const carbonDocuments = await strapi.services['carbon-documents'].find({
    status: 'swapped',
    _sort: 'credit_start:asc',
    // swapped status means that the are ready to be used for burning and they have supply remaining
    'developer_nft.status': 'swapped',
  })
  const nfts = carbonDocuments.map((nft) => nft.developer_nft)

  let totalAmountBurned = 0
  let nftsToBurn = []
  nfts.forEach((nft) => {
    if (amount > totalAmountBurned && nft.burnWillTimeoutOn < Date.now()) {
      totalAmountBurned += nft.supply_remaining.toInt()
      nftsToBurn.push(nft)
    }
  })
  if (amount > totalAmountBurned) throw new Error('Not enough NFTs to burn')
  return nftsToBurn
}

async function uploadFilesToIPFS(compensation) {
  return new Promise(async (resolve, reject) => {
    try {
      const ipfsCIDs = []
      for (const nft of compensation.registry_certificates) {
        const file = await getFileFromS3(nft.url)
        const result = await uploadFileToIPFS(file, nft.mime)
        ipfsCIDs.push(result)
      }
      resolve(ipfsCIDs)
    } catch (e) {
      reject(e)
    }
  })
}
