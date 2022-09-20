const wallets = require('./wallet')
const algosdk = require('algosdk')
const { Buffer } = require('buffer')
const createPublicUser = async () => {
  let user = (await strapi.query('user', 'users-permissions').find({ username: 'pepe' }))[0]
  if (!user) {
    const publicRole = await strapi.query('role', 'users-permissions').findOne({ type: 'public' })
    user = await strapi.query('user', 'users-permissions').create({
      username: 'pepe',
      email: 'pepe@test.com',
      type: 'developer',
      role: publicRole,
    })
  }

  return {
    user,
  }
}

const createAuthenticatedUser = async () => {
  const username = Buffer.from(algosdk.decodeAddress(wallets.user.wallet).publicKey).toString('base64')
  user = await strapi.plugins['users-permissions'].services.user.fetch({ username })
  if (!user) {
    const authenticatedRole = await strapi.query('role', 'users-permissions').findOne({ type: 'authenticated' })
    user = await strapi.query('user', 'users-permissions').create({
      username,
      email: 'pepa@test.com',
      type: 'buyer',
      role: authenticatedRole,
      confirmed: false,
      language: 'en',
      publicAddress: wallets.user.wallet,
      issuer: 'my-algo-connect',
    })
  }
  jwt = await strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id })

  return {
    user,
    jwt,
  }
}

const createAdminUser = async () => {
  const role = await strapi.query('role', 'admin').findOne({ code: 'strapi-super-admin' })
  let superAdmin = await strapi.query('user', 'admin').findOne({ email: 'admintest@admin.com', roles: [role.id] })
  if (superAdmin == null) {
    superAdmin = await strapi
      .query('user', 'admin')
      .create({ blocked: false, email: 'admintest@admin.com', firstname: 'Admin', isActive: true, roles: [role.id] })
  }
  return strapi.admin.services.token.createJwtToken(superAdmin)
}

const deleteUser = async (userId) => {
  await strapi.query('user', 'users-permissions').delete({ id: userId })
}

const fetchUser = async (userId) => {
  return await strapi.plugins['users-permissions'].services.user.fetch({ id: userId })
}

function parseEntries(params) {
  return params.reduce((prev, curr) => {
    const key = Buffer.from(curr.key, 'base64').toString()
    if (curr.value.type === 1) {
      prev[key] = Buffer.from(curr.value.bytes, 'base64')
    } else if (curr.value.type === 2) {
      prev[key] = curr.value.uint
    }
    return prev
  }, {})
}

function signEncodedTransactions(txnsFromAPI) {
  const userPKB64 = Buffer.from(algosdk.decodeAddress(wallets.user.wallet).publicKey).toString('base64')
  const userSigner = algosdk.mnemonicToSecretKey(wallets.user.nemonic)
  const unsignedTxns = txnsFromAPI.map((txn) => algosdk.decodeUnsignedTransaction(Buffer.from(Object.values(txn))))
  const result = []
  for (const txnid in unsignedTxns) {
    if (!unsignedTxns[txnid]) continue
    const txn = unsignedTxns[txnid]
    if (Buffer.from(txn.from.publicKey).toString('base64') !== userPKB64)
      result.push({ txID: txn.txID(), blob: txn.toByte() })
    else
      result.push({
        txID: txn.txID(),
        blob: txn.signTxn(userSigner.sk),
      })
  }

  return result.map((txn) => txn.blob)
}

module.exports = {
  createPublicUser,
  createAuthenticatedUser,
  createAdminUser,
  deleteUser,
  fetchUser,
  parseEntries,
  signEncodedTransactions,
}
