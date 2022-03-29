'use strict'

const crypto = require('crypto')
const algorand = {}
const ALGORAND_ENUMS = require(`${process.cwd()}/utils/enums/algorand`)
const algosdk = require('algosdk')
const fs = require('fs')

function getHashedMetadata(metadata) {
  return new Uint8Array(crypto.createHash('sha256').update(JSON.stringify(metadata)).digest())
}

function encodeMetadataText(metadata) {
  return new TextEncoder().encode(JSON.stringify(metadata))
}

async function getAssetConfig(algodClient, type = ALGORAND_ENUMS.DEFAULT, options = {}) {
  if (type !== ALGORAND_ENUMS.DEFAULT) {
    return {}
  }

  return {
    unitName: options.unitName ?? ALGORAND_ENUMS.UNITS.CARBON,
    assetName: options.assetName ?? ALGORAND_ENUMS.ASSET_NAMES.CARBON_ARC69,
    total: options.total ?? 1, // NFTs have totalIssuance of exactly 1
    decimals: options.decimals ?? 0, // NFTs have decimals of exactly 0
    manager: options.manager ?? undefined,
    reserve: options.reserve ?? undefined,
    freeze: options.freeze ?? undefined,
    clawback: options.clawback ?? undefined,
    defaultFrozen: options.defaultFrozen ?? false,
    suggestedParams: await algodClient.getTransactionParams().do(),
  }
}

function getAssetOptions(creator, isToken = false, total = 1) {
  const assetOptions = {
    manager: creator.addr,
    freeze: creator.addr,
    total: Number(total),
  }

  if (isToken) {
    assetOptions.unitName = 'TOKEN'
    assetOptions.assetName = 'Token'
    assetOptions.reserve = creator.addr
    assetOptions.decimals = 1
  }

  return assetOptions
}

function getDecodedNote(note) {
  return Buffer.from(note, 'base64').toString()
}

function getTransactionMetadata(body) {
  let transactions = body.transactions
  transactions = transactions.filter((transaction) => transaction['tx-type'] === 'acfg')
  const lastConfigTransactionNote = transactions.slice(-1).pop().note
  const assetMetadata = getDecodedNote(lastConfigTransactionNote)

  return JSON.parse(assetMetadata)
}

function getContract() {
  const buff = fs.readFileSync(`${process.cwd()}/utils/algorand/climatecoin_vault_asc.json`)
  const contract = new algosdk.ABIContract(JSON.parse(buff.toString()))

  return contract
}

function getMethodByName(name) {
  const contract = getContract()
  const m = contract.methods.find((mt) => {
    return mt.name == name
  })
  if (m === undefined) throw Error('Method undefined: ' + name)
  return m
}

function getEscrowFromApp(appId) {
  return algosdk.getApplicationAddress(appId)
}

module.exports = {
  algorand,
  getHashedMetadata,
  encodeMetadataText,
  getAssetConfig,
  getAssetOptions,
  getDecodedNote,
  getTransactionMetadata,
  getContract,
  getMethodByName,
  getEscrowFromApp,
}
