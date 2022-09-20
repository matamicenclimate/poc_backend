const request = require('supertest')
const path = require('path')
const fs = require('fs')
const { algoClient, algoIndexer } = require('../../../config/algorand')
const algosdk = require('algosdk')
const { parseEntries } = require('../helpers')

describe('Mint', () => {
  const indexerClient = algoIndexer()
  const client = algoClient()
  let nftHoldingsBefore = {}
  async function updateCompensationState(newState) {
    createdCompensation = await strapi.services.compensations.update(
      { id: createdCompensation.id },
      {
        state: newState,
      },
    )
  }
  beforeAll(async () => {
    for (const nft of createdCompensation.nfts) {
      const dumpContractCompensationNFTHoldings = await indexerClient
        .lookupAccountAssets(algosdk.getApplicationAddress(Number(process.env.DUMP_APP_ID)))
        .assetId(Number(nft.asa_id))
        .do()
      nftHoldingsBefore[Number(nft.asa_id)] = dumpContractCompensationNFTHoldings?.assets[0].amount
    }
  })
  test('Approve compensation state', async () => {
    await updateCompensationState('pending_notification')
    expect(createdCompensation.state).toBe('pending_notification')
    await updateCompensationState('pending_certificates')
    expect(createdCompensation.state).toBe('pending_certificates')
    await updateCompensationState('received_certificates')
    expect(createdCompensation.state).toBe('received_certificates')
  })
  test('User Mint Denial', async () => {
    await request(strapi.server)
      .post(`/compensations/${createdCompensation.id}/mint`)
      .set('Authorization', 'Bearer ' + jwt)
      .expect(403)
  })
  test('Upload registry certificates', async () => {
    for (const cert of createdCompensation.registry_certificates) {
      const uploadResponse = await request(strapi.server)
        .post('/upload')
        .set('Authorization', 'Bearer ' + adminJwt)
        .expect(200)
        .type('form')
        .field('data', JSON.stringify({}))
        .attach('files', path.resolve(__dirname, '../media/registry.pdf'))
      expect(uploadResponse.body).toBeDefined()
      const uploadedRegistryID = uploadResponse.body[0].id

      const s3Response = await request(uploadResponse.body[0].url).get('').expect(200).expect('Content-Type', /pdf/)
      expect(s3Response.body).toBeDefined()

      const updateResponse = await request(strapi.server)
        .put(`/registry-certificates/${cert.id}`)
        .set('Authorization', 'Bearer ' + adminJwt)
        .send({
          Registry_Certificate: uploadedRegistryID,
        })
        .expect(200)
      expect(updateResponse.body).toBeDefined()
      expect(updateResponse.body.id).toBe(cert.id)
      expect(updateResponse.body.Registry_Certificate).toBeDefined()
    }
    createdCompensation = await strapi.services.compensations.findOne({ id: createdCompensation.id })
  })
  test('Mint', async () => {
    const response = await request(strapi.server)
      .post(`/compensations/${createdCompensation.id}/mint`)
      .set('Authorization', 'Bearer ' + adminJwt)
      .expect(200)
      .expect('Content-Type', /json/)

    expect(response.body).toBeDefined()
    expect(response.body.state).toBe('minted')
    expect(response.body.consolidation_certificate_ipfs_cid).toBeDefined()

    const ipfsCert = await request('https://cloudflare-ipfs.com')
      .get(`/ipfs/${response.body.consolidation_certificate_ipfs_cid}`)
      .expect(200)
      .expect('Content-Type', /pdf/)
    expect(ipfsCert.body).toBeDefined()

    createdCompensation = await strapi.services.compensations.findOne({ id: createdCompensation.id })

    expect(createdCompensation.compensation_nft).toBeDefined()

    const appContractCompensationNFTHoldings = await indexerClient
      .lookupAccountAssets(algosdk.getApplicationAddress(Number(process.env.APP_ID)))
      .assetId(Number(createdCompensation.compensation_nft.asa_id))
      .do()
    expect(appContractCompensationNFTHoldings?.assets[0].amount).toBe(1)

    for (const nft of createdCompensation.nfts) {
      const dumpContractCompensationNFTHoldings = await indexerClient
        .lookupAccountAssets(algosdk.getApplicationAddress(Number(process.env.DUMP_APP_ID)))
        .assetId(Number(nft.asa_id))
        .do()
      expect(dumpContractCompensationNFTHoldings?.assets.length).toBe(1)
      expect(dumpContractCompensationNFTHoldings?.assets[0].amount).toBe(
        nftHoldingsBefore[Number(nft.asa_id)] + createdCompensation.burn_receipt[Number(nft.asa_id)],
      )
    }
  })
})
