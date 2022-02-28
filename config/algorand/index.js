'use strict'

const algosdk = require('algosdk')
require('dotenv').config()

function algoclient() {
  return new algosdk.Algodv2(process.env.ALGO_API_TOKEN, process.env.ALGO_HOST_URL, process.env.ALGO_HOST_PORT)
}

function algoKmd() {
  return new algosdk.Kmd(
    process.env.ALGO_API_TOKEN ?? '',
    process.env.ALGO_KMD_HOST_URL,
    process.env.ALGO_KMD_HOST_PORT,
  )
}

function algoIndexer() {
  return new algosdk.Indexer(
    process.env.ALGO_API_TOKEN ?? '',
    process.env.ALGO_INDEXER_HOST_URL,
    process.env.ALGO_INDEXER_HOST_PORT,
  )
}

module.exports = {
  algoclient,
  algoKmd,
  algoIndexer,
}
