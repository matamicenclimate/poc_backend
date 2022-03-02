const request = require('supertest')

describe('Methodologies', () => {
  let dataStub = {
    name: 'test1',
    description: '',
  }

  let createdElement

  it('POST /methodologies', async () => {
    await request(strapi.server)
      .post(`/methodologies`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).toBe(dataStub.name)
        createdElement = response.body
      })
  })

  it('GET /methodologies', async () => {
    await request(strapi.server)
      .get(`/methodologies`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('GET /methodologies/{id}', async () => {
    await request(strapi.server)
      .get(`/methodologies/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('PUT /methodologies/{id}', async () => {
    await request(strapi.server)
      .put(`/methodologies/${createdElement.id}`)
      .send({ name: 'updated name' })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).not.toBe(dataStub.name)
      })
  })

  it('DELETE /methodologies/{id}', async () => {
    await request(strapi.server)
      .delete(`/methodologies/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdElement.id)
      })
  })
})
