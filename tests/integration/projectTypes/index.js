const request = require('supertest')

describe('Project-types', () => {
  let dataStub = {
    name: "test1"
  }

  let createdProjectType

  it('POST /project-types', async () => {
    await request(strapi.server)
      .post(`/project-types`)
      .send({ ...dataStub })
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).toBe(dataStub.name)
        createdProjectType = response.body
      })
  })

  it('GET /project-types', async () => {
    await request(strapi.server)
      .get(`/project-types`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('GET /project-types/{id}', async () => {
    await request(strapi.server)
      .get(`/project-types/${createdProjectType.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
      })
  })

  it('PUT /project-types/{id}', async () => {
    await request(strapi.server)
      .put(`/project-types/${createdProjectType.id}`)
      .send({name: 'updated name'})
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.name).not.toBe(dataStub.name)
      })
  })

  it('DELETE /project-types/{id}', async () => {
    await request(strapi.server)
      .delete(`/project-types/${createdProjectType.id}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response) => {
        expect(response.body).toBeDefined()
        expect(response.body.id).toBe(createdProjectType.id)
      })
  })
})