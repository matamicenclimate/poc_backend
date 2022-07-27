const algosdk = require("algosdk");
const {algoClient, algoIndexer} = require("../../../config/algorand");

async function fundUser(user, amount) {
  const algodClient = algoClient()
  const suggestedParams = await algodClient.getTransactionParams().do()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  const minimumFundsPaymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: creator.addr,
    to: user.publicAddress,
    amount: algosdk.algosToMicroalgos(amount),
    suggestedParams: suggestedParams,
  })

  const signedTxn = minimumFundsPaymentTxn.signTxn(creator.sk)
  const txId = minimumFundsPaymentTxn.txID().toString()

  await algodClient.sendRawTransaction(signedTxn).do()
  await algosdk.waitForConfirmation(algodClient, txId, 3)
}

module.exports = {
  lifecycles: {
    beforeUpdate: async function (params, newUser) {
      const { _id } = params
      const oldUser = await strapi.db.query('plugins::users-permissions.user').findOne({_id})
      if (oldUser.id !== _id) throw new Error(`User not found with id: ${_id}`)
      if (oldUser.publicAddress !== newUser.publicAddress) {
        const indexerClient = algoIndexer()
        try {
          const userAddress = await indexerClient.lookupAccountByID(newUser.publicAddress).do()
        } catch (e) {
          if (e.status !== 404) throw e
          console.log("Funding new user")
          await fundUser(newUser, Number(process.env.ALGOS_TO_NEW_USER))
        }
      }
    },
  },
}
