const request = require('supertest')
const path = require('path')

describe('Carbon-documents', () => {
  let dataStub = {
    title: "test1",
    credits: 454545454,
    serial_number: "serialNumber",
    created_by_user: "test@test.com",
    status: "pending",
  }

  let createdDocument

  it('POST /carbon-documents', async () => {
    await request(strapi.server)
      .post(`/carbon-documents`)
      .field('title', dataStub.title)
      .field('credits', dataStub.credits)
      .field('serial_number', dataStub.serial_number)
      .field('created_by_user', dataStub.created_by_user)
      .field('status', dataStub.status)
      .attach('document', path.resolve(__dirname, '../../helpers/test-file.txt'))
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
        expect(response.body.length).toBe(1)
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
      .send({title: 'updated title', status: 'pending'})
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