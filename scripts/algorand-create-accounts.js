const algosdk = require('algosdk')

try {
  const acct = algosdk.generateAccount()
  const account1 = acct.addr
  console.log("Account 1 = " + account1)
  const account1_mnemonic = algosdk.secretKeyToMnemonic(acct.sk)
  console.log("Account Mnemonic 1 = " + account1_mnemonic)
} catch(e) {
  console.log(e)
}

