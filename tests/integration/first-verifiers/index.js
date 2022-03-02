const request = require('supertest')

describe('First-verifiers', () => {
  let dataStub = {
    name: 'test1',
    description: '',
  }

  let createdElement

  it('POST /first-verifiers', async () => {
    await request(strapi.server)
      .post(`/first-verifiers`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).toBe(dataStub.name)
        createdElement = response.body
      })
  })

  it('GET /first-verifiers', async () => {
    await request(strapi.server)
      .get(`/first-verifiers`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('GET /first-verifiers/{id}', async () => {
    await request(strapi.server)
      .get(`/first-verifiers/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('PUT /first-verifiers/{id}', async () => {
    await request(strapi.server)
      .put(`/first-verifiers/${createdElement.id}`)
      .send({ name: 'updated name' })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).not.toBe(dataStub.name)
      })
  })

  it('DELETE /first-verifiers/{id}', async () => {
    await request(strapi.server)
      .delete(`/first-verifiers/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdElement.id)
      })
  })
})
