'use strict'

const algosdk = require('algosdk')

const { algoClient } = require(`${process.cwd()}/config/algorand`)
const algorandUtils = require(`${process.cwd()}/utils/algorand`)
const ALGORAND_ENUMS = require('../../../utils/enums/algorand')
const { readFileFromUploads } = require('../../../utils/upload')

const { createPDF, generateCompensationPDF } = require('../../../utils/pdf')
const { uploadFileToIPFS } = require('../../../utils/ipfs')
const { parseMultipartData, sanitizeEntity } = require('strapi-utils')
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

async function calculate(ctx) {
  const { amount } = ctx.request.query
  const user = ctx.state.user

  const nftsToBurn = await getNFTsToBurn(Number(amount))
  if (!nftsToBurn.length) {
    throw new Error('There are no nfts to burn')
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
    foreignAssets: assetsToCompensateFrom,
    accounts: [algosdk.getApplicationAddress(Number(process.env.DUMP_APP_ID))],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  const burnGroupTxn = [climatecoinTransferTxn, burnParametersTxn, burnTxn]
  const [transfer, params, burn] = algosdk.assignGroupID(burnGroupTxn)

  const encodedTransferTxn = algosdk.encodeUnsignedTransaction(transfer)
  const encodedBurnTxn = algosdk.encodeUnsignedTransaction(burn)

  const signedTxn = await params.signTxn(creator.sk)

  return {
    address: user.publicAddress,
    amount: Number(amount),
    assets: assetsToCompensateFrom,
    nftIds,
    txn: signedTxn,
    encodedTransferTxn,
    encodedBurnTxn,
  }
}

async function create(ctx) {
  let entity
  if (ctx.is('multipart')) {
    const { data, files } = parseMultipartData(ctx)
    entity = await strapi.services.compensations.create(data, { files })
  } else {
    entity = await strapi.services.compensations.create(ctx.request.body)
  }
  return sanitizeEntity(entity, { model: strapi.models.compensations })
}

async function me(ctx) {
  const user = ctx.state.user.id
  const activities = await strapi.services.compensations.find({ user: user, ...ctx.query })

  return activities
}

async function mint(ctx) {
  const { id } = ctx.params
  const compensation = await strapi.services['compensations'].findOne({ id })
  if (!['received_certificates'].includes(compensation.state)) {
    return ctx.badRequest("Compensation hasn't been reviewed")
  }
  const ipfsCIDs = await uploadFilesToIPFS(compensation)
  const algodclient = algoClient()

  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  try {
    const filePath = `${compensation.id}.pdf`
    const html = generateCompensationPDF(compensation.txn_id, ipfsCIDs, compensation.nfts, compensation.burn_receipt)
    await createPDF(html, filePath)

    const pdfBuffer = await readFileFromUploads(filePath)
    const consolidationPdfCid = await uploadFileToIPFS(pdfBuffer, 'application/pdf')

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

      const nftDb = await strapi.services['nfts'].create({
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
}

async function getNFTsToBurn(amount) {
  const byLastInserted = 'id:desc'
  const nfts = await strapi.services.nfts.find({ status: 'swapped', _sort: byLastInserted })
  let totalAmountBurned = 0
  let nftsToBurn = []
  nfts.forEach((nft) => {
    if (amount > totalAmountBurned) {
      totalAmountBurned += nft.supply_remaining
      nftsToBurn.push(nft)
    }
  })
  return nftsToBurn
}

async function uploadFilesToIPFS(compensation) {
  return new Promise(async (resolve, reject) => {
    try {
      const ipfsCIDs = []
      for (const nft of compensation.registry_certificates) {
        const file = await readFileFromUploads(`${nft.hash}${nft.ext}`)
        const result = await uploadFileToIPFS(file, nft.mime)
        ipfsCIDs.push(result)
      }
      resolve(ipfsCIDs)
    } catch (e) {
      reject(e)
    }
  })
}
