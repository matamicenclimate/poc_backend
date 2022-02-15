async function sendMail(subject, content) {
  try {
    await strapi.plugins['email'].services.email.send({
      to: process.env.MAILGUN_EMAIL_TO,
      from: process.env.MAILGUN_EMAIL,
      replyTo: process.env.MAILGUN_EMAIL,
      subject,
      text: content,
      html: content,
    })

    return true
  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  send: sendMail,
}