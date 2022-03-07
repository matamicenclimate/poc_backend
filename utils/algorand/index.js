'use strict'

const crypto = require('crypto')
const algorand = {}
const ALGORAND_ENUMS = require(`${process.cwd()}/utils/enums/algorand`)

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
    total: options.assetName ?? 1, // NFTs have totalIssuance of exactly 1
    decimals: options.assetName ?? 0, // NFTs have decimals of exactly 0
    manager: options.manager ?? undefined,
    reserve: options.reserve ?? undefined,
    freeze: options.freeze ?? undefined,
    clawback: options.clawback ?? undefined,
    defaultFrozen: options.defaultFrozen ?? false,
    suggestedParams: await algodClient.getTransactionParams().do(),
  }
}

module.exports = {
  algorand,
  getHashedMetadata,
  encodeMetadataText,
  getAssetConfig,
}
