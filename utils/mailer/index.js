'use strict'

const { getHTMLTemplate } = require('./mail_template')
const { LogoBuffer } = require('../pdf/index')
const mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN })
const crypto = require('crypto')

const MAIL_ACTIONS = {
  SENT: 'sent',
  SENDING: 'sending',
}

async function sendMail(email, subject, content, images = []) {
  // TODO: REMOVE THIS WHEN MAILGUN IN PRODUCTION
  let recipients = [process.env.MAILGUN_EMAIL_TO]
  if (email === 'alex.casas@climatetrade.com') recipients.push(email)
  try {
    await strapi.plugins['email'].services.email.send({
      //to: email ?? process.env.MAILGUN_EMAIL_TO,
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

async function sendTemplateMail(subject, content, user, images = []) {
  const { email, confirmed } = user
  if (!confirmed) return
  await sendMail(email, subject, content, images)
}

async function sendVerificationMail(email) {
  const confirmationToken = crypto.randomBytes(20).toString('hex')

  const verificationMailData = {
    title: 'Email verification',
    claim: `Click the button below to verify your email.`,
    text: `Please verify your email to be able to receive email notifications about the status of your compensations and carbon documents.`,
    button_2: {
      label: 'Verify email',
      href: `${process.env.FRONTEND_BASE_URL}/verify-email?token=${confirmationToken}`,
    },
  }

  const confirmedMail = generateMailHtml(verificationMailData)
  await sendMail(email, 'Email verification', confirmedMail)

  return confirmationToken
}

function logMailAction(collection, status, action, user) {
  strapi.log.info(`[ ${collection} status ${status} ] mail ${action} to ${user}`)
}

function generateMailHtml(mailContent) {
  return getHTMLTemplate(mailContent)
}

module.exports = {
  send: sendTemplateMail,
  MAIL_ACTIONS,
  logMailAction,
  generateMailHtml,
  sendVerificationMail,
}
