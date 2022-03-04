const request = require('supertest')

describe('Countries', () => {
  let dataStub = {
    name: 'test1',
    code: 'te',
  }

  let createdElement

  it('POST /countries', async () => {
    await request(strapi.server)
      .post(`/countries`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).toBe(dataStub.name)
        createdElement = response.body
      })
  })

  it('GET /countries', async () => {
    await request(strapi.server)
      .get(`/countries`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('GET /countries/{id}', async () => {
    await request(strapi.server)
      .get(`/countries/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('PUT /countries/{id}', async () => {
    await request(strapi.server)
      .put(`/countries/${createdElement.id}`)
      .send({ name: 'updated name' })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).not.toBe(dataStub.name)
      })
  })

  it('DELETE /countries/{id}', async () => {
    await request(strapi.server)
      .delete(`/countries/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdElement.id)
      })
  })
})
