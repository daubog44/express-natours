const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

module.exports = function sendSMS(verifyNum, phone) {
  client.messages
    .create({
      body: `your number auth is ${verifyNum}`,
      messagingServiceSid: 'MG1de875bae9b6371794ffdd647b75f01b',
      to: `${phone}`,
    })
    .then((message) => console.log(message.sid))
    .done();
};
