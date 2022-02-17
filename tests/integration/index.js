const request = require('supertest')

describe('Registries', () => {
  let dataStub = {
    name: "test1"
  }

  let createdRegistry

  it('POST /registries', async () => {
    await request(strapi.server)
      .post(`/registries`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).toBe(dataStub.name)
        createdRegistry = response.body
      })
  })

  it('GET /registries', async () => {
    await request(strapi.server)
      .get(`/registries`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('GET /registries/{id}', async () => {
    await request(strapi.server)
      .get(`/registries/${createdRegistry.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('PUT /registries/{id}', async () => {
    await request(strapi.server)
      .put(`/registries/${createdRegistry.id}`)
      .send({name: 'updated name'})
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).not.toBe(dataStub.name)
      })
  })

  it('DELETE /registries/{id}', async () => {
    await request(strapi.server)
      .delete(`/registries/${createdRegistry.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdRegistry.id)
      })
  })
})
