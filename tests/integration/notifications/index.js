const request = require('supertest')

describe('Notifications', () => {
  let dataStub = {
    title: 'test1',
    description: 'test1 description',
  }

  let createdElement

  it('POST /notifications', async () => {
    await request(strapi.server)
      .post(`/notifications`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.title).toBe(dataStub.title)
        createdElement = response.body
      })
  })

  it('GET /notifications', async () => {
    await request(strapi.server)
      .get(`/notifications`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('GET /notifications/{id}', async () => {
    await request(strapi.server)
      .get(`/notifications/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('PUT /notifications/{id}', async () => {
    await request(strapi.server)
      .put(`/notifications/${createdElement.id}`)
      .send({ title: 'updated title' })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.title).not.toBe(dataStub.title)
      })
  })

  it('DELETE /notifications/{id}', async () => {
    await request(strapi.server)
      .delete(`/notifications/${createdElement.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdElement.id)
      })
  })
})
