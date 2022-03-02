const request = require('supertest')

describe('Standards', () => {
  let dataStub = {
    name: 'test1',
    description: '',
  }

  let createdElement

  it('POST /standards', async () => {
    await request(strapi.server)
      .post(`/standards`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).toBe(dataStub.name)
        createdElement = response.body
      })
  })

  it('GET /standards', async () => {
    await request(strapi.server)
      .get(`/standards`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('GET /standards/{id}', async () => {
    await request(strapi.server)
      .get(`/standards/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('PUT /standards/{id}', async () => {
    await request(strapi.server)
      .put(`/standards/${createdElement.id}`)
      .send({ name: 'updated name' })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).not.toBe(dataStub.name)
      })
  })

  it('DELETE /standards/{id}', async () => {
    await request(strapi.server)
      .delete(`/standards/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdElement.id)
      })
  })
})
