'use strict'

/**
 * web3-auth.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash')
const crypto = require('crypto')

const { getAbsoluteServerUrl } = require('strapi-utils')
const algosdk = require('algosdk')
const { Buffer } = require('buffer')

module.exports = {
  settings() {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'web3-auth',
    })
    return pluginStore.get({ key: 'settings' })
  },

  algoClient() {
    return new algosdk.Algodv2(process.env.ALGO_API_TOKEN, process.env.ALGO_HOST_URL, process.env.ALGO_HOST_PORT)
  },

  async isEnabled() {
    const settings = await this.settings()
    return !!settings.enabled
  },

  async user(address) {
    const settings = await this.settings()
    const { user: userService } = strapi.plugins['users-permissions'].services
    const publicKey = algosdk.decodeAddress(address).publicKey
    const publicKeyB64 = Buffer.from(publicKey).toString('base64')
    const user = await userService.fetch({ username: publicKeyB64 })

    if (!user && settings.createUserIfNotExists) {
      const role = await strapi.query('role', 'users-permissions').findOne({ type: settings.default_role }, [])

      if (!role) {
        return ctx.badRequest('Default role not found. Contact an administrator.')
      }

      return await strapi.query('user', 'users-permissions').create({
        username: publicKeyB64,
        publicAddress: address,
        type: 'buyer',
        role: role.id,
      })
    }
    return user
  },

  async getChallengeTransaction(token) {
    const settings = await this.settings()
    const enc = new TextEncoder()

    const noteInstructions = settings.loginMessage
    const address = token.address
    const asaId = settings.asaId
    const noteRaw = noteInstructions + '\n' + token.challenge
    const note = enc.encode(noteRaw)

    const algodClient = this.algoClient()
    const suggestedParams = await algodClient.getTransactionParams().do()

    return asaId === 0
      ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: address,
          amount: Number(0),
          suggestedParams,
          note,
        })
      : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: address,
          assetIndex: Number(asaId),
          to: address,
          amount: Number(0),
          suggestedParams,
          note,
        })
  },

  async createToken(address) {
    const tokensService = strapi.query('tokens', 'web3-auth')
    const publicKeyB64 = Buffer.from(algosdk.decodeAddress(address).publicKey).toString('base64')
    const oldTokens = await tokensService.find({ public_key: publicKeyB64 })
    await Promise.all(
      oldTokens.map((token) => {
        return tokensService.update({ id: token.id }, { is_active: false })
      }),
    )
    const challenge = crypto.randomBytes(16).toString('base64')
    const tokenInfo = {
      address,
      public_key: publicKeyB64,
      challenge,
      create_date: new Date(),
    }
    return tokensService.create(tokenInfo)
  },

  updateTokenOnLogin(token) {
    const tokensService = strapi.query('tokens', 'web3-auth')
    return tokensService.update({ id: token.id }, { is_active: false, login_date: new Date() })
  },

  async isTokenValid(token) {
    if (!token || !token.is_active) {
      return false
    }
    const settings = await this.settings()
    const tokensService = strapi.query('tokens', 'web3-auth')

    const tokenDate = new Date(token.createdAt).getTime() / 1000
    const nowDate = new Date().getTime() / 1000

    const isValidDate = nowDate - tokenDate <= settings.expire_period
    if (!isValidDate) {
      await tokensService.update({ id: token.id }, { is_active: false })
    }
    return isValidDate
  },

  fetchToken(public_key, challenge) {
    const tokensService = strapi.query('tokens', 'web3-auth')
    return tokensService.findOne({ public_key, challenge })
  },
}
