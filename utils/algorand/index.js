'use strict'

const algorand = {}
const algosdk = require('algosdk')
const fs = require('fs')

function encodeMetadataText(metadata) {
  return new TextEncoder().encode(JSON.stringify(metadata))
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
  encodeMetadataText,
  getContract,
  getMethodByName,
  getEscrowFromApp,
}
