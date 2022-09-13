const request = require('supertest')
const path = require('path')
const fs = require('fs')

describe('Sumbit', () => {
  let dataStub = {
    title: 'Test1',
    description: 'Description of the testing project',
    project_url: 'https://climatetrade.com/es/inicio/',
    thumbnail: {},
    cover: {},
    project_registration: '2022-01-01',
    credit_start: '2022-01-01',
    credit_end: '2022-12-31',
    credits: 50000,
    serial_number: '0x91876523726',
    status: 'pending',
    registry_url: 'https://climatetrade.com/es/inicio/',
    pdd: {},
    verification_report: {},
    registry: '',
  }
  beforeAll(async () => {
    const registries = await strapi.services.registries.find({})
    dataStub.registry = registries[0].id
  })

  test('Create Carbon Document', async () => {
    await request(strapi.server)
      .post(`/carbon-documents`)
      .field('title', dataStub.title)
      .field('description', dataStub.description)
      .field('project_url', dataStub.project_url)
      .field('project_registration', dataStub.project_registration)
      .field('credit_start', dataStub.credit_start)
      .field('credit_end', dataStub.credit_end)
      .field('credits', dataStub.credits)
      .field('serial_number', dataStub.serial_number)
      .field('status', dataStub.status)
      .field('registry_url', dataStub.registry_url)
      .field('registry', dataStub.registry)
      .attach('pdd', path.resolve(__dirname, '../media/registry.pdf'))
      .attach('verification_report', path.resolve(__dirname, '../media/registry.pdf'))
      .attach('thumbnail', path.resolve(__dirname, '../media/thumbnail.jpg'))
      .attach('cover', path.resolve(__dirname, '../media/cover.jpg'))
      .expect(200)
      .expect('Content-Type', /json/)
      .set('Authorization', 'Bearer ' + jwt)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.title).toBe(dataStub.title)
        createdDocument = response.body
      })
  })
  test('Carbon Document Upload Integrity', async () => {
    await request(createdDocument.thumbnail.url)
      .get('')
      .expect(200)
      .expect('Content-Type', /image/)
      .then(async (response) => {
        expect(response.body).toBeDefined()
        await fs.readFile(path.resolve(__dirname, '../media/thumbnail.jpg'), (err, data) => {
          const fileData = data.toString('base64')
          expect(response.body.toString('base64')).toBe(fileData)
        })
      })
  })
})
