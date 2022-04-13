const request = require('supertest')

describe('Activities', () => {
  let dataStub = {
    date: new Date(),
    type: 'swap',
  }

  let createdElement

  it('POST /activities', async () => {
    await request(strapi.server)
      .post(`/activities`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.type).toBe(dataStub.type)
        createdElement = response.body
      })
  })

  it('GET /activities', async () => {
    await request(strapi.server)
      .get(`/activities`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('GET /activities/{id}', async () => {
    await request(strapi.server)
      .get(`/activities/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('PUT /activities/{id}', async () => {
    await request(strapi.server)
      .put(`/activities/${createdElement.id}`)
      .send({ date: new Date() })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.date).not.toBe(new Date())
      })
  })

  it('DELETE /activities/{id}', async () => {
    await request(strapi.server)
      .delete(`/activities/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdElement.id)
      })
  })
})
