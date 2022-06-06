const request = require('supertest')
const path = require('path')

describe('Carbon-documents', () => {
  let dataStub = {
    title: 'test1',
    description: 'test1',
    project_url: 'test1',
    thumbnail: {},
    cover: {},
    project_registration: '2022-01-01',
    credit_start: '2022-01-01',
    credit_end: '2022-12-31',
    credits: 454545454,
    serial_number: 'serialNumber',
    created_by_user: 'test@test.com',
    status: 'pending',
    registry_url: 'test1',
    pdd: {},
    verification_report: {},
  }

  let createdDocument

  it('POST /carbon-documents', async () => {
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
      .field('created_by_user', dataStub.created_by_user)
      .field('status', dataStub.status)
      .field('registry_url', dataStub.registry_url)
      .attach('pdd', path.resolve(__dirname, '../../helpers/test-file.txt'))
      .attach('verification_report', path.resolve(__dirname, '../../helpers/test-file.txt'))
      .attach('thumbnail', path.resolve(__dirname, '../../helpers/test.png'))
      .attach('cover', path.resolve(__dirname, '../../helpers/test.png'))
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.title).toBe(dataStub.title)
        createdDocument = response.body
      })
  })

  it('GET /carbon-documents', async () => {
    await request(strapi.server)
      .get(`/carbon-documents`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.length > 0).toBe(true)
      })
  })

  it('GET /carbon-documents/{id}', async () => {
    await request(strapi.server)
      .get(`/carbon-documents/${createdDocument.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.title).toBe(dataStub.title)
      })
  })

  it('PUT /carbon-documents/{id}', async () => {
    await request(strapi.server)
      .put(`/carbon-documents/${createdDocument.id}`)
      .send({ title: 'updated title', status: 'pending' })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.title).not.toBe(dataStub.title)
      })
  })

  it('DELETE /carbon-documents/{id}', async () => {
    await request(strapi.server)
      .delete(`/carbon-documents/${createdDocument.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdDocument.id)
      })
  })
})
