/*
 *
 * HomePage
 *
 */

import React, { useState, useEffect, memo } from 'react'
import pluginId from '../../pluginId'
import { request } from 'strapi-helper-plugin'
import { Container, Block, P, AlgoWalletIMG, AlgoWalletButton } from '../../components/Styled'
import { InputText, Button, Padded, Toggle } from '@buffetjs/core'
import { SessionWallet, allowedWallets } from 'algorand-session-wallet'
import algosdk from 'algosdk'
import { Buffer } from 'buffer'

const HomePage = () => {
  const [enabled, setEnabled] = useState(false)
  const [createUser, setCreateUser] = useState(false)
  const [expire, setExpire] = useState('')
  const [asa, setAsa] = useState('')
  const [msg, setMsg] = useState('')

  const [sw, setSw] = useState(new SessionWallet('TestNet'))
  const [addrs, setAddrs] = useState(sw.accountList())
  const [connected, setConnected] = useState(false)
  const [jwt, setJwt] = useState('')
  const [magicKey, setMagicKey] = useState('')

  useEffect(() => {
    try {
      const loadSettings = async () => {
        const response = await request(`/${pluginId}/settings`, {
          method: 'GET',
        })
        setMagicKey(response.magic)

        const { enabled, createUserIfNotExists, expire_period, asaId, loginMessage } = response.settings
        setEnabled(enabled)
        setCreateUser(createUserIfNotExists)
        setExpire(expire_period)
        setAsa(asaId)
        setMsg(loginMessage)
        setConnected(await sw.connected())
      }
      loadSettings()
    } catch (err) {
      strapi.notification.error(err.toString())
    }
  }, [])

  const updateSettings = async (e) => {
    try {
      e.preventDefault()
      strapi.lockApp()
      const response = await request(`/${pluginId}/settings`, {
        method: 'PUT',
        body: {
          enabled: enabled,
          createUserIfNotExists: createUser,
          expire_period: Number(expire),
          asaId: Number(asa),
          loginMessage: msg,
        },
      })
      strapi.notification.success('Success')
    } catch (err) {
      strapi.notification.error((err.response && err.response.payload.message) || err.toString())
    }
    strapi.unlockApp()
  }

  async function connect(choice) {
    let email = undefined
    if (choice === 'magic-link') email = window.prompt('Email to sign in', '')
    const w = new SessionWallet(
      'TestNet',
      undefined,
      choice,
      email,
      magicKey,
      'https://node.testnet.algoexplorerapi.io',
    )

    if (!(await w.connect())) return alert('Could not connect')

    setConnected(await w.connected())
    setAddrs(w.accountList())
    setSw(w)
  }

  async function disconnect() {
    sw.disconnect()
    setConnected(false)
    setAddrs([])
    setSw(sw)
  }

  async function login(e) {
    const response = await request(`/${pluginId}/challenge/${await sw.getDefaultAccount()}`, {
      method: 'GET',
    })

    const { challengeTxn } = response

    const rawTxnChallenge = Buffer.from(Object.values(challengeTxn))
    const unsignedTxn = algosdk.decodeUnsignedTransaction(rawTxnChallenge)

    const signedTxns = await sw.signTxn([unsignedTxn])
    const signedTxn = signedTxns[0]

    const responseJWT = await request(`/${pluginId}/login`, {
      method: 'POST',
      body: { challengeTxn: signedTxn },
    })

    setJwt(responseJWT.jwt)
  }

  const wallets = []
  for (const [k, v] of Object.entries(allowedWallets)) {
    wallets.push({ k, image: v.img(false), name: v.displayName() })
  }

  return (
    <div className="row">
      <div className="col-md-12">
        <Container>
          <Block>
            <h1>Web3 Authentication</h1>
            <p>Configure here the login process</p>

            <form onSubmit={updateSettings}>
              <P>Enable or disable authentication using this plugin.</P>
              <Toggle name="enabledToggle" onChange={({ target: { value } }) => setEnabled(value)} value={enabled} />
              <P>Allow new user registrations.</P>
              <Toggle
                name="createUserToggle"
                onChange={({ target: { value } }) => setCreateUser(value)}
                value={createUser}
              />
              <P>Set the token life in seconds.</P>
              <InputText
                value={expire}
                onChange={(e) => setExpire(e.target.value)}
                name="expireInput"
                type="number"
                placeholder="0"
              />
              <P>
                Set the Algorand Asset ID to create the authentication transaction. Use 0 to make an Algo transfer
                instead.
              </P>
              <InputText
                value={asa}
                onChange={(e) => setAsa(e.target.value)}
                name="asaInput"
                type="number"
                placeholder="0"
              />
              <P>Set the message that will be included in the authentication transaction notes.</P>
              <InputText
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                name="msgInput"
                type="text"
                placeholder="This is a sample transaction to authenticate you in the website, it will never be completed."
              />

              <Padded top>
                <Button color="primary" label="Save" type="submit" />
              </Padded>
            </form>
          </Block>
        </Container>
        <Container>
          <Block>
            <h2>Test authentication process</h2>
            <p>Generate a JWT by using any algorand wallet provider.</p>
            <Padded top>
              <div className="actions">
                {connected ? (
                  <>
                    <Button style={{ marginRight: 16 }} color="delete" key="disco" onClick={disconnect}>
                      Sign out
                    </Button>
                    <Button color="success" key="sign" onClick={login}>
                      Log in
                    </Button>
                  </>
                ) : (
                  wallets.map((wallet) => (
                    <AlgoWalletButton
                      key={wallet.k}
                      onClick={() => {
                        connect(wallet.k)
                      }}
                    >
                      <AlgoWalletIMG src={wallet.image} alt="branding"></AlgoWalletIMG>
                      {wallet.name}
                    </AlgoWalletButton>
                  ))
                )}
              </div>
              <Padded top>
                {addrs.map((a) => {
                  return <P key={a}>{a}</P>
                })}
              </Padded>

              <P>Generated JWT Token</P>
              <InputText value={jwt} name="jwtInput" type="text" />
            </Padded>
          </Block>
        </Container>
      </div>
    </div>
  )
}

export default memo(HomePage)
