'use strict';
/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */
/* eslint-disable no-useless-escape */
const _ = require('lodash');
const {sanitizeEntity} = require('strapi-utils');
const algosdk = require('algosdk')
const {Buffer} = require("buffer");
const nacl = require("tweetnacl");

module.exports = {
  async login(ctx) {
    const params = _.assign(ctx.request.body);
    const w3a = strapi.plugins['web3-auth'].services['web3-auth'];
    const {user: userService, jwt: jwtService} = strapi.plugins['users-permissions'].services;
    const isEnabled = await w3a.isEnabled();

    if (!isEnabled) {
      return ctx.badRequest('This authentication method is disabled!');
    }

    if (_.isEmpty(params.challengeTxn)) {
      return ctx.badRequest('Invalid transaction');
    }

    const decodedSignedTransaction = algosdk.decodeSignedTransaction(Buffer.from(Object.values(params.challengeTxn.blob)))

    const publicKeyTxn = decodedSignedTransaction.txn.to.publicKey
    const publicKeyB64 = Buffer.from(publicKeyTxn).toString('base64')
    const signature = Buffer.from(decodedSignedTransaction.sig)
    const rawTxnBytes = decodedSignedTransaction.txn.bytesToSign()
    const txnNote = decodedSignedTransaction.txn.note
    const note = new TextDecoder().decode(txnNote);
    const challenge = note.split("\n")[1]

    const validTxn = nacl.sign.detached.verify(rawTxnBytes, signature, publicKeyTxn)
    if (!validTxn) {
      return ctx.badRequest('Signature not valid')
    }

    const token = await w3a.fetchToken(publicKeyB64, challenge);
    if (!token || token.public_key !== publicKeyB64 || token.challenge !== challenge) {
      return ctx.badRequest('Token not found')
    }

    const isValid = await w3a.isTokenValid(token);
    if (!isValid) {
      return ctx.badRequest('Token expired');
    }

    await w3a.updateTokenOnLogin(token);

    let user = await userService.fetch({username: publicKeyB64});

    if (!user) {
      return ctx.badRequest('User not found');
    }

    if (user.blocked) {
      return ctx.badRequest('User blocked');
    }

    let newUserData = {}

    if (params.email && params.email !== user.email) {
      newUserData.email = params.email
    }
    if (params.issuer && params.issuer !== user.issuer) {
      newUserData.issuer = params.issuer
    }

    if (!_.isEmpty(newUserData)) {
      user = await userService.edit({id: user.id}, newUserData)
    }

    ctx.send({
      jwt: jwtService.issue({id: user.id}),
      user: sanitizeEntity(user, {
        model: strapi.query('user', 'users-permissions').model,
      }),
    });
  },

  async prepareChallenge(ctx) {
    const w3a = strapi.plugins['web3-auth'].services['web3-auth'];

    const isEnabled = await w3a.isEnabled();

    if (!isEnabled) {
      return ctx.badRequest('This authentication method is disabled!');
    }

    const { address } = ctx.params;

    if (!address) {
      return ctx.badRequest('Missing address in body');
    }

    if (!algosdk.isValidAddress(address)) {
      return ctx.badRequest('Algorand address invalid')
    }

    const user = await w3a.user(address);

    if (!user) {
      return ctx.badRequest('User not found');
    }

    if (user.blocked) {
      return ctx.badRequest('User blocked');
    }

    try {
      const token = await w3a.createToken(address);
      const authenticationTransaction = await w3a.getChallengeTransaction(token);
      const encodedAuthTxn = algosdk.encodeUnsignedTransaction(authenticationTransaction);
      ctx.send({
        challengeTxn: encodedAuthTxn
      });
    } catch (err) {
      return ctx.badRequest(null, err);
    }
  },

};