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
  const encodedFundsTxn = algosdk.encodeUnsignedTransaction(funds)
  const encodedParamsTxn = algosdk.encodeUnsignedTransaction(params)

  // const groupID = burn.group.toString('base64')
  const txnbuffer = Buffer.concat([encodedTransferTxn, encodedFundsTxn, encodedParamsTxn, encodedBurnTxn])
  const signature = algosdk.signBytes(txnbuffer, creator.sk)

  return {
    amount: Number(amount),
    assets: assetsToCompensateFrom,
    nftIds,
    encodedTransferTxn,
    encodedFundsTxn,
    encodedParamsTxn,
    encodedBurnTxn,
    signature,
  }
}

async function create(ctx) {
  const { signedTxn, signature, ...compensationData } = ctx.request.body
  const user = ctx.state.user
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  if (!signedTxn) ctx.reject('Txn is missing in request body')

  const algodClient = algoClient()
  const txnBlob = [
    Buffer.from(Object.values(signedTxn[0])),
    Buffer.from(Object.values(signedTxn[1])),
    Buffer.from(Object.values(signedTxn[2])),
    Buffer.from(Object.values(signedTxn[3])),
  ]
  const txnObj = [
    algosdk.decodeSignedTransaction(txnBlob[0]).txn,
    algosdk.decodeUnsignedTransaction(txnBlob[1]),
    algosdk.decodeUnsignedTransaction(txnBlob[2]),
    algosdk.decodeSignedTransaction(txnBlob[3]).txn,
  ]
  const txnBytes = txnObj.map((txn) => algosdk.encodeUnsignedTransaction(txn))
  const txnBuffer = Buffer.concat(txnBytes)

  if (!signature || !algosdk.verifyBytes(txnBuffer, Buffer.from(Object.values(signature)), creator.addr))
    return ctx.badRequest('Transactions manipulated')

  // TODO: Should we also check here for groupID?

  txnBlob[1] = txnObj[1].signTxn(creator.sk)
  txnBlob[2] = txnObj[2].signTxn(creator.sk)

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

  const compensationNftOptinTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: user.publicAddress,
    assetIndex: Number(compensationNft.asa_id),
    to: user.publicAddress,
    amount: Number(0),
    suggestedParams,
  })

  const sendCertificateNFTTxn = algosdk.makeApplicationCallTxnFromObject({
    from: creator.addr,
    appIndex: Number(process.env.APP_ID),
    appArgs: [
      algorandUtils.getMethodByName('send_burn_nft_certificate').getSelector(),
      algosdk.encodeUint64(1),
      algosdk.encodeUint64(0),
    ],
    foreignAssets: [Number(compensationNft.asa_id)],
    accounts: [user.publicAddress],
    foreignApps: [Number(compensation.contract_id)],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  sendCertificateNFTTxn.fee += 2 * algosdk.ALGORAND_MIN_TX_FEE

  const compensationClaimGroupTxn = [compensationNftOptinTxn, sendCertificateNFTTxn]
  const [optin, send] = algosdk.assignGroupID(compensationClaimGroupTxn)

  const encodedOptinTxn = algosdk.encodeUnsignedTransaction(optin)
  const encodedSendTxn = algosdk.encodeUnsignedTransaction(send)
  // const signedApproveTxn = await approve.signTxn(creator.sk)

  const groupID = send.group.toString('base64')
  await strapi.services.compensations.update({ id }, { state: 'minted', claim_group_id: groupID })

  return {
    compensationId: id,
    encodedOptinTxn,
    encodedSendTxn,
  }
}

async function claimCertificate(ctx) {
  const { id } = ctx.params
  const { signedTxn } = ctx.request.body
  const user = ctx.state.user
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)
  // TODO Use indexer to has updated fields
  const compensation = await strapi.services.compensations.findOne({ id })

  if (compensation.id !== id) return ctx.badRequest('Compensation not found')
  if (!signedTxn) throw new Error('Txn is missing in request body')
  if (compensation.user.id !== user.id) return ctx.unauthorized()

  const algodClient = algoClient()
  const txnBlob = [Buffer.from(Object.values(signedTxn[0])), Buffer.from(Object.values(signedTxn[1]))]

  const txnObj = [algosdk.decodeSignedTransaction(txnBlob[0]).txn, algosdk.decodeUnsignedTransaction(txnBlob[1])]

  for (const txn of txnObj) {
    if (compensation.claim_group_id !== txn.group.toString('base64')) return ctx.badRequest('Transactions manipulated')
    // To calculate again the groupid hash
    txn.group = undefined
  }

  const computedGroupID = algosdk.computeGroupID(txnObj).toString('base64')
  if (compensation.claim_group_id !== computedGroupID) return ctx.badRequest('Transactions manipulated')

  txnBlob[1] = algosdk.decodeUnsignedTransaction(txnBlob[1]).signTxn(creator.sk)

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
    const consolidationPdfCid = await uploadFileToIPFS(consolidationPdfBuffer, 'application/pdf', compensation.id)

    const compensationNftId = await algoFn.mintCompensationNft(algodclient, creator, compensation, consolidationPdfCid)
    const approveTxnId = await algoFn.approve_burn(
      algodclient,
      creator,
      compensation.user,
      compensation,
      compensationNftId,
    )

    const updatedCompensation = await strapi.services['compensations'].update(
      { id },
      {
        ...compensation,
        state: 'minted',
        compensation_nft: compensationNftId,
        consolidation_certificate_ipfs_cid: consolidationPdfCid,
        approve_txn_id: approveTxnId,
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
      const result = await atc.execute(algodclient, 4)
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
  approve_burn: async (algodclient, creator, user, compensation, compensationNftId) => {
    const nftsToBurn = compensation.nfts.map((nft) => Number(nft.asa_id))
    const suggestedParams = await algodclient.getTransactionParams().do()
    const compensationNft = await strapi.services.nfts.findOne({ id: compensationNftId })

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

    const signedApproveTxn = approveBurnTxn.signTxn(creator.sk)
    const { txId } = await algodclient.sendRawTransaction(signedApproveTxn).do()
    await algosdk.waitForConfirmation(algodclient, txId, 4)
    return txId
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
      for (const nft of compensation.nfts) {
        const file = await getFileFromS3(nft.registry_certificate[0].url)
        const result = await uploadFileToIPFS(file, nft.registry_certificate[0].mime, nft.id)
        await strapi.services['nfts'].update(
          { id: nft.id },
          {
            registry_certificate_ipfs_cid: result,
          },
        )
        ipfsCIDs.push(result)
      }
      resolve(ipfsCIDs)
    } catch (e) {
      reject(e)
    }
  })
}
