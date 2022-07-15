// Mail delivery queue service
const mailer = require(`${process.cwd()}/utils/mailer`)
const registryConfig = require('config').registry
const Queue = require('node-persistent-queue')

const queue = new Queue('./.mail-queue.db')
queue.open().then(() => queue.start())

/**
 * Simplistic queue job handler.
 */
class QueueHandler {
  /**
   * @param {string} userEmail
   * @param {string} registryInstructions
   */
  async handleAccepted(userEmail, registryInstructions) {
    mailer.logMailAction('carbon-documents', statuses.ACCEPTED, mailer.MAIL_ACTIONS.SENDING, userEmail)
    await mailer.send('Document status changed to accepted', registryInstructions, userEmail)
    mailer.logMailAction('carbon-documents', statuses.ACCEPTED, mailer.MAIL_ACTIONS.SENT, userEmail)
    await strapi.services['carbon-documents'].update({ id: result._id }, { status: statuses.WAITING_FOR_CREDITS })
  }

  async handleCompleted() {
    mailer.logMailAction('carbon-documents', statuses.COMPLETED, mailer.MAIL_ACTIONS.SENDING, userEmail)
    await mailer.send(
      'Credits received',
      `We have received your credits.<br>You will receive your tokens in a cooldown of 48 hours.`,
      userEmail,
    )
    mailer.logMailAction('carbon-documents', statuses.COMPLETED, mailer.MAIL_ACTIONS.SENT, userEmail)
  }

  /**
   * @param {import('./Job').default} job
   */
  async handleJob(job) {
    await new Promise((r) => process.nextTick(r))
    switch (job.mode) {
      case 'accepted':
        await this.handleAccepted(job.target, job.instructions)
        break
      default: // This only should happen if a bug has been introduced.
        throw new Error(`Attempting to process a job of unknown type "${job.mode}"!`)
    }
  }
}

const handler = new QueueHandler()
queue.on('next', (job) => handler.handleJob(job))

/**
 * Handles the enqueueing of new mails to be sent, the job also might cause status updates.
 */
class DeliveryService {
  DeliveryService = DeliveryService
  QueueHandler = QueueHandler

  /**
   * Enqueues the delivery of an "ACCEPTED" status mail.
   * @param {string} target The target mail.
   * @param {string} instructions Instructions to be sent, if any.
   */
  deliverAccepted(target, instructions = registryConfig.defaultInstructions) {
    queue.add({ mode: 'accepted', target, instructions })
  }

  deliverCompleted() {}
}

module.exports = new DeliveryService()
