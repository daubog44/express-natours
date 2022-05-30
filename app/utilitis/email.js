const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');
//const mg = require('nodemailer-mailgun-transport');
const SibApiV3Sdk = require('sib-api-v3-sdk');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.nameUser = user.name;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Darius Bogdan <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // sendGrid

      // with ELASTICEMAIL
      return nodemailer.createTransport({
        host: `${process.env.ELASTICEMAIL_HOST}`,
        port: process.env.ELASTICEMAIL_PORT,
        auth: {
          user: `${process.env.ELASTICEMAIL_USERNAME}`,
          pass: `${process.env.ELASTICEMAIL_PASSWORD}`,
        },
      });
    }

    // with mailtrap

    return (transport = nodemailer.createTransport({
      host: `${process.env.EMAIL_HOST}`,
      port: process.env.EMAIL_PORT,
      auth: {
        user: `${process.env.EMAIL_USERNAME}`,
        pass: `${process.env.EMAIL_PASSWORD}`,
      },
    }));

    // with mailgun

    /*
    return nodemailer.createTransport({
      host: `${process.env.MAILGUN_HOST}`,
      port: process.env.EMAIL_PORT,
      auth: {
        user: `${process.env.MAILGUN_USERNAME}`,
        pass: `${process.env.MAILGUN_PASSWORD}`,
        //domain: `${process.env.MAILGUN_DOMAIN}`,
        //api_key: `${process.env.MAILGUN_API_KEY}`,
      },
    });*/

    // with sendiblue
    /*
    return nodemailer.createTransport({
      host: `${process.env.SENDIBLUE_SERVER_SMTP}`,
      port: process.env.EMAIL_PORT,
      auth: {
        user: `${process.env.SENDIBLUE_USERNAME}`,
        pass: `${process.env.SENDINBLUE_SMTP_PASSWORD}`,
        api_key: `${process.env.SENDIBLUE_API_KEY}`,
      },
    });*/
  }

  // send actual email
  async send(template, subject) {
    // 1) render HTML based on pug template
    const html = pug.renderFile(
      `${__dirname}/../../front-end/views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      }
    );
    // 2) define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };

    // create transport and send it
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'welcome to the Natours family!');
  }

  async verifySignUp() {
    await this.send('verifySignUp', 'hello from Natours, verify email!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};
