'use strict'

const { getHTMLTemplate } = require('./mail_template')

const MAIL_ACTIONS = {
  SENT: 'sent',
  SENDING: 'sending',
}

async function sendMail(subject, content, mailTo) {
  try {
    await strapi.plugins['email'].services.email.send({
      to: mailTo ?? process.env.MAILGUN_EMAIL_TO,
      from: process.env.MAILGUN_EMAIL,
      replyTo: process.env.MAILGUN_EMAIL,
      subject,
      text: content,
      html: content,
    })

    return true
  } catch (error) {
    strapi.log.error(error)
  }
}

function logMailAction(collection, status, action, user) {
  strapi.log.info(`[ ${collection} status ${status} ] mail ${action} to ${user}`)
}

function generateMailHtml(mailContent) {
  return getHTMLTemplate(mailContent)
}

module.exports = {
  send: sendMail,
  MAIL_ACTIONS,
  logMailAction,
  generateMailHtml,
}
