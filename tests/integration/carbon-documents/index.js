const request = require('supertest')
const path = require('path')

let user
let jwt

describe('Carbon-documents', () => {
  beforeAll(async () => {
    user = (await strapi.query('user', 'users-permissions').find({ username: 'pepe' }))[0]
    if (!user) {
      const publicRole = await strapi.query('role', 'users-permissions').findOne({ type: 'public' })
      user = await strapi.query('user', 'users-permissions').create({
        username: 'pepe',
        email: 'pepe@test.com',
        type: 'developer',
        role: publicRole,
      })
    }
    jwt = await strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id })
  })
  afterAll(async () => {
    await strapi.query('user', 'users-permissions').delete({ id: user.id })
  })

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
      .field('status', dataStub.status)
      .field('registry_url', dataStub.registry_url)
      .attach('pdd', path.resolve(__dirname, '../../helpers/test-file.txt'))
      .attach('verification_report', path.resolve(__dirname, '../../helpers/test-file.txt'))
      .attach('thumbnail', path.resolve(__dirname, '../../helpers/test.png'))
      .attach('cover', path.resolve(__dirname, '../../helpers/test.png'))
      .expect(200)
      .expect('Content-Type', /json/)
      .set('Authorization', 'Bearer ' + jwt)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.title).toBe(dataStub.title)
        createdDocument = response.body
      })
  })

  it('GET /carbon-documents', async () => {
    await request(strapi.server)
      .get(`/carbon-documents`)
      .set('Authorization', 'Bearer ' + jwt)
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
      .set('Authorization', 'Bearer ' + jwt)
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
