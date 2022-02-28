'use strict'

const algosdk = require('algosdk')
const { algoKmd, algoIndexer, algoClient } = require(`${process.cwd()}/config/algorand`)

// def find_sandbox_faucet(kmd_client, indexer_client):
//     default_wallet_name = kmd_client.list_wallets()[0]["name"]
//     wallet = Wallet(
//         default_wallet_name, "", kmd_client
//     )  # Sandbox's wallet has no password

//     for account_ in wallet.list_keys():
//         info = indexer_client.account_info(account_).get("account")
//         if info.get("status") == "Online" and info.get("created-at-round") == 0:
//             return Account(address=account_, private_key=wallet.export_key(account_))

//     raise KeyError("Could not find sandbox faucet")

const findSandboxFaucet = async (kmdClient, indexerClient) => {
  const defaultWalletId = (await kmdClient.listWallets()).wallets[0].id
  const initWallet = (await kmdClient.initWalletHandle(defaultWalletId, '')).wallet_handle_token
  const keys = await kmdClient.listKeys(initWallet)
  const masterWallet = keys.addresses[0]
  const exportKey = await kmdClient.exportKey(initWallet, '', masterWallet)
  const mn = algosdk.secretKeyToMnemonic(exportKey.private_key)
  return algosdk.mnemonicToSecretKey(mn)
}

// def fund(
//   algod_client,
//   faucet: Account,
//   receiver: Account,
//   amount=util.algos_to_microalgos(FUND_ACCOUNT_ALGOS),
// ):
//   params = get_params(algod_client)
//   txn = transaction.PaymentTxn(faucet.address, params, receiver.address, amount)
//   return sign_send_wait(algod_client, faucet, txn)

const fund = async (algodClient, receiver, faucet) => {
  const suggestedParams = await algodClient.getTransactionParams().do()
  const amountInMicroAlgos = algosdk.algosToMicroalgos(2) // 2 Algos
  const unsignedTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: faucet.addr,
    to: receiver.addr,
    amount: amountInMicroAlgos,
    suggestedParams: suggestedParams,
  })
  // Sign the transaction
  let signedTxn = unsignedTxn.signTxn(faucet.sk)
  let txId = unsignedTxn.txID().toString()
  console.log('Signed transaction with txID: %s', txId)

  // Submit the transaction
  await algodClient.sendRawTransaction(signedTxn).do()

  // Wait for confirmation
  let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4)
  //Get the completed Transaction
  console.log('Transaction ' + txId + ' confirmed in round ' + confirmedTxn['confirmed-round'])
  // let mytxinfo = JSON.stringify(confirmedTxn.txn.txn, undefined, 2);
  // console.log("Transaction information: %o", mytxinfo);
  const string = new TextDecoder().decode(confirmedTxn.txn.txn.note)
  console.log('Note field: ', string)
  const accountInfo = await algodClient.accountInformation(receiver.addr).do()
  console.log('Transaction Amount: %d microAlgos', confirmedTxn.txn.txn.amt)
  console.log('Transaction Fee: %d microAlgos', confirmedTxn.txn.txn.fee)
  console.log('Account balance: %d microAlgos', accountInfo.amount)
}

const createAccounts = async () => {
  try {
    const algodClient = algoClient()
    const kmdClient = algoKmd()
    const indexerClient = algoIndexer()
    const faucet = await findSandboxFaucet(kmdClient, indexerClient)
    const acct = algosdk.generateAccount()
    await fund(algodClient, acct, faucet)
    console.log('Account 1 = ' + acct.addr)
    const account1_mnemonic = algosdk.secretKeyToMnemonic(acct.sk)
    console.log('Account Mnemonic 1 = ' + account1_mnemonic)

    const acct2 = algosdk.generateAccount()
    const account2 = acct2.addr
    console.log('Account 2 = ' + account2)
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
