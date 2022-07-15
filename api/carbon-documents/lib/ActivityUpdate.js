class ActivityUpdate {
  /**
   * @param {{status: string, id: number, created_by_user: string}} result
   * @return {Promise<void>}
   */
  async updateActivity(result) {
    const userDb = await strapi.plugins['users-permissions'].services.user.fetch({
      email: result.created_by_user,
    })
    await strapi.services.notifications.create({
      title: `Carbon document ${result.status}`,
      description: `Carbon document status changed to ${result.status}`,
      model: 'carbon-documents',
      model_id: result.id,
      user: userDb.id,
    })
  }

  /**
   * @param {{status: string}} result
   * @returns {Promise<boolean>}
   */
  async shouldAddActivity(result) {
    return result.status === 'swapped'
  }

  /**
   * @param {{developer_nft: string}} result
   * @returns {Promise<void>}
   */
  async addActivity(result) {
    await strapi.services.activities.add(userDb, result.developer_nft)
  }
}

module.exports = new ActivityUpdate()
