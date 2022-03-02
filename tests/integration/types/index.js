const request = require('supertest')

describe('Types', () => {
  let dataStub = {
    name: 'test1',
    description: '',
  }

  let createdElement

  it('POST /types', async () => {
    await request(strapi.server)
      .post(`/types`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).toBe(dataStub.name)
        createdElement = response.body
      })
  })

  it('GET /types', async () => {
    await request(strapi.server)
      .get(`/types`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('GET /types/{id}', async () => {
    await request(strapi.server)
      .get(`/types/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('PUT /types/{id}', async () => {
    await request(strapi.server)
      .put(`/types/${createdElement.id}`)
      .send({ name: 'updated name' })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).not.toBe(dataStub.name)
      })
  })

  it('DELETE /types/{id}', async () => {
    await request(strapi.server)
      .delete(`/types/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdElement.id)
      })
  })
})
