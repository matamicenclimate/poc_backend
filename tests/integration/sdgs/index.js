const request = require('supertest')

describe('SDGs', () => {
  let dataStub = {
    name: 'test1',
    description: '',
  }

  let createdElement

  it('POST /sdgs', async () => {
    await request(strapi.server)
      .post(`/sdgs`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).toBe(dataStub.name)
        createdElement = response.body
      })
  })

  it('GET /sdgs', async () => {
    await request(strapi.server)
      .get(`/sdgs`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('GET /sdgs/{id}', async () => {
    await request(strapi.server)
      .get(`/sdgs/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('PUT /sdgs/{id}', async () => {
    await request(strapi.server)
      .put(`/sdgs/${createdElement.id}`)
      .send({ name: 'updated name' })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).not.toBe(dataStub.name)
      })
  })

  it('DELETE /sdgs/{id}', async () => {
    await request(strapi.server)
      .delete(`/sdgs/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdElement.id)
      })
  })
})
