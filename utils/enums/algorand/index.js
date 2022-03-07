'use strict'

const DEFAULT = 'default'

const FEES = {
  FEE: 0.05,
}

const UNITS = {
  ALGO: 'ALGO',
  CARBON: 'CARBON',
}

const ARCS = {
  ARC69: 'arc69',
}

const ASSET_NAMES = {
  CARBON_ARC69: 'Carbon Document@arc69',
}

const MINT_DEFAULTS = {
  ASSET_URL: 'https://path/to/my/nft/asset/metadata.json',
  MEDIA_TYPE_SPECIFIER: '#p',
  METADATA_DESCRIPTION: 'Carbon Emission Credit',
  EXTERNAL_URL: 'https://www.climatetrade.com/assets/....yoquese.pdf',
}

const TXN_TYPES = {
  ASSET_CREATION: 'assetCreation',
  FEE_ASSET_CREATION: 'feeAssetCreation',
}

const MINT_MIME_TYPES = {
  PDF: 'file/pdf',
}

module.exports = {
  FEES,
  UNITS,
  ARCS,
  ASSET_NAMES,
  MINT_DEFAULTS,
  TXN_TYPES,
  MINT_MIME_TYPES,
  DEFAULT,
}
