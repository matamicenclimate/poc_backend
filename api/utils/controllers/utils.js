'use strict'

const { algoClient, algoIndexer } = require(`${process.cwd()}/config/algorand`)
const algorandUtils = require(`${process.cwd()}/utils/algorand`)
const algosdk = require('algosdk')
const https = require('https')

async function swap(ctx) {
  const { id } = ctx.request.body
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)
  const algodClient = algoClient()
  const indexerUrl = `${process.env.ALGO_INDEXER_HOST_URL}/v2/assets/${id}/transactions`
  return new Promise((resolve, reject) => {
    https
      .get(indexerUrl, (res) => {
        let assetTransactions = ''
        res.on('data', (d) => {
          assetTransactions += d.toString()
        })
        res.on('end', async () => {
          assetTransactions = JSON.parse(assetTransactions)
          const assetMetadata = algorandUtils.getTransactionMetadata(assetTransactions)
          const transactionCredits = assetMetadata.properties.Credits
          const suggestedParams = await algodClient.getTransactionParams().do()
          const applicationTxn = algosdk.makeApplicationCallTxnFromObject({
            appIndex: 1,
            from: creator.addr,
            onComplete: algosdk.OnApplicationComplete.NoOpOC,
            suggestedParams,
            appArgs: [new Uint8Array('credits'), algorandUtils.encodeMetadataText(transactionCredits)],
            note: algorandUtils.encodeMetadataText(assetMetadata),
          })
          const signedTxn = applicationTxn.signTxn(creator.sk)

          resolve(signedTxn)
        })
      })
      .on('error', (e) => {
        reject(e)
      })
  })
}

module.exports = {
  swap,
}
