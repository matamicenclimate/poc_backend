const request = require('supertest')
const { fetchUser, signEncodedTransactions } = require('../helpers')
const wallet = require('../helpers/wallet')
const { Buffer } = require('buffer')
const algosdk = require('algosdk')

describe('Authentication', () => {
  let challengeTxn
  test('Request challenge transaction', async () => {
    const response = await request(strapi.server)
      .get(`/web3-auth/challenge/${wallet.user.wallet}`)
      .expect(200)
      .expect('Content-Type', /json/)
    expect(response.body).toBeDefined()
    expect(response.body.challengeTxn).toBeDefined()

    challengeTxn = response.body.challengeTxn
  })

  test('Login with signed transaction', async () => {
    const signedTxns = signEncodedTransactions([challengeTxn])
    const signedTxn = signedTxns[0]

    const response = await request(strapi.server)
      .post(`/web3-auth/login`)
      .expect(200)
      .expect('Content-Type', /json/)
      .send({
        challengeTxn: { blob: signedTxn },
        issuer: 'wallet-connect',
        email: user.email,
      })

    expect(response.body).toBeDefined()

    const testRequest = await request(strapi.server)
      .get('/users/me')
      .expect(200)
      .expect('Content-Type', /json/)
      .set('Authorization', 'Bearer ' + response.body.jwt)

    expect(testRequest.body).toBeDefined()
  })
})
