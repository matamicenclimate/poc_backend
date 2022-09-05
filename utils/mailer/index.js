'use strict'

const { getHTMLTemplate } = require('./mail_template')
const { LogoBuffer } = require('../pdf/index')
const mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN })
const crypto = require('crypto')
const t = require('../locales')

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

async function sendVerificationMail(email, language = 'en') {
  const confirmationToken = crypto.randomBytes(20).toString('hex')

  const verificationMailData = {
    title: t(language, 'Email.Verification.title'),
    claim: t(language, 'Email.Verification.claim'),
    text: t(language, 'Email.Verification.text'),
    button_2: {
      label: t(language, 'Email.Verification.button_2'),
      href: `${process.env.FRONTEND_BASE_URL}/verify-email?token=${confirmationToken}`,
    },
  }

  const confirmedMail = generateMailHtml(verificationMailData)
  await sendMail(email, t(language, 'Email.Verification.subject'), confirmedMail)

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
