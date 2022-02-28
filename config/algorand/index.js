const algosdk = require('algosdk')

function algoclient() {
  return new algosdk.Algodv2(
    process.env.ALGO_API_TOKEN,
    process.env.ALGO_HOST_URL,
    process.env.ALGO_HOST_PORT,
  )
}

module.exports = {
  algoclient,
}
