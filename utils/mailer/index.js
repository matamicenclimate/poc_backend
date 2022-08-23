'use strict'

const { getHTMLTemplate } = require('./mail_template')
const { LogoBuffer } = require('../pdf/index')
const mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN })

const MAIL_ACTIONS = {
  SENT: 'sent',
  SENDING: 'sending',
}

async function sendMail(subject, content, mailTo, images = []) {
  // TODO: REMOVE THIS WHEN MAILGUN IN PRODUCTION
  let recipients = [process.env.MAILGUN_EMAIL_TO]
  if (mailTo === 'alex.casas@climatetrade.com') recipients.push(mailTo)
  try {
    await strapi.plugins['email'].services.email.send({
      //to: mailTo ?? process.env.MAILGUN_EMAIL_TO,
      // TODO: CUENTA DE CORREOS ES DE TIPO SANDBOX, SOLO SE PUEDE ENVIAR A CUENTAS DETERMINADAS
      to: recipients.join(','),
      from: process.env.MAILGUN_EMAIL,
      replyTo: process.env.MAILGUN_EMAIL,
      subject,
      text: content,
      html: content,
      inline: [
        new mailgun.Attachment({ data: LogoBuffer, filename: 'logo.png' }),
        ...images.map((image) => new mailgun.Attachment({ data: image.buffer, filename: image.cid })),
      ],
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
