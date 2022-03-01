'use strict'

const algosdk = require('algosdk')
const { algoKmd, algoIndexer, algoClient } = require(`${process.cwd()}/config/algorand`)

const findSandboxFaucet = async (kmdClient, indexerClient) => {
  const defaultWalletId = (await kmdClient.listWallets()).wallets[0].id
  const initWallet = (await kmdClient.initWalletHandle(defaultWalletId, '')).wallet_handle_token
  const keys = await kmdClient.listKeys(initWallet)
  const masterWallet = keys.addresses[0]
  const exportKey = await kmdClient.exportKey(initWallet, '', masterWallet)
  const mn = algosdk.secretKeyToMnemonic(exportKey.private_key)
  return algosdk.mnemonicToSecretKey(mn)
}

const createAndFund = async (algodClient, faucet) => {
  const amountInMicroAlgos = algosdk.algosToMicroalgos(2) // 2 Algos

  const newAccount = algosdk.generateAccount()

  await sendPaymentTxn(algodClient, amountInMicroAlgos, faucet, newAccount)

  return newAccount
}

const sendPaymentTxn = async (algodClient, amount, sender, receiver) => {
  const suggestedParams = await algodClient.getTransactionParams().do()
  const unsignedTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: sender.addr,
    to: receiver.addr,
    amount: amount,
    suggestedParams: suggestedParams,
  })
  // Sign the transaction
  const signedTxn = unsignedTxn.signTxn(sender.sk)
  const txId = unsignedTxn.txID().toString()

  // Submit the transaction
  await algodClient.sendRawTransaction(signedTxn).do()

  // Wait for confirmation
  const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4)

  //Get the completed Transaction
  console.log('Transaction ' + txId + ' confirmed in round ' + confirmedTxn['confirmed-round'])
}

const createAccounts = async () => {
  try {
    const algodClient = algoClient()
    const kmdClient = algoKmd()
    const indexerClient = algoIndexer()
    const faucet = await findSandboxFaucet(kmdClient, indexerClient)

    // Create first account
    const acct = await createAndFund(algodClient, faucet)
    console.log('Account 1 = ' + acct.addr)
    const account1_mnemonic = algosdk.secretKeyToMnemonic(acct.sk)
    console.log('Account Mnemonic 1 = ' + account1_mnemonic)

    // Create second account
    const acct2 = await createAndFund(algodClient, faucet)
    console.log('Account 2 = ' + acct2.addr)
    const account2_mnemonic = algosdk.secretKeyToMnemonic(acct2.sk)
    console.log('Account Mnemonic 2 = ' + account2_mnemonic)
  } catch (e) {
    console.log(e)
  }
}

createAccounts()

// Account 1 = 73CVPVLLCZG6IIPWXU6T4H7HHGGDUAB5FREZREEPUSSBEK4ZYJ2HLVMLUI
// Account Mnemonic 1 = actor float tired slice holiday craft prefer shell enough fog girl assume edge employ piece address antenna kidney square chuckle example congress tell able ketchup
// Is this a valid address: true
// Account created.Save off Mnemonic and address

// Add funds to all of these accounts using the TestNet Dispenser at https://bank.testnet.algorand.network/

// Copy off these 3 lines of code and they will be pasted in the subsequent Tutorial code
// var account1_mnemonic = "actor float tired slice holiday craft prefer shell enough fog girl assume edge employ piece address antenna kidney square chuckle example congress tell able ketchup"
// var account2_mnemonic = "crumble foil love below clog way cluster first castle energy rich coin thing tribe skull sentence awful destroy main buyer cable warm welcome abstract excite"
// var account3_mnemonic = "green inside final anchor antenna radio vintage rubber coil leaf anger insane round room moment industry basket entire lazy quiz enlist dad dilemma about program"

// Account 1 Info: { "round": 5983626, "address": "RNFJFZRDOKY3ZTDXDZY7JXZF6PXRJX3Z6OKJREJCATXKAHE27PEN6S3WSI", "amount": 100000000, "pendingrewards": 0, "amountwithoutpendingrewards": 100000000, "rewards": 0, "status": "Offline" }
// Account 2 Info: { "round": 5983626, "address": "NONFSLZNME4AKQMEPV5FTOKZEQPF4UB6GN5ERFZ5UGWIZB3IUBZ6MET5AI", "amount": 100000000, "pendingrewards": 0, "amountwithoutpendingrewards": 100000000, "rewards": 0, "status": "Offline" }
// Account 3 Info: { "round": 5983626, "address": "SYYUGUEKECUK7ORTRH3MM2TPSG6ZCTB4ORQGUN7DKNJ7R26B36NIVMZLIY", "amount": 100000000, "pendingrewards": 0, "amountwithoutpendingrewards": 100000000, "rewards": 0, "status": "Offline" }
