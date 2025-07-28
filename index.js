const express = require('express');
const fs = require('fs');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
console.log('📝 Incoming body:', req.body);

app.use(express.json());

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const smsRecipients = process.env.SMS_RECIPIENTS
  ? process.env.SMS_RECIPIENTS.split(',').map(num => num.trim())
  : [];

function logWebhook(data) {
  const log = `${new Date().toISOString()}\nRAW:\n${JSON.stringify(data, null, 2)}\n\n`;
  fs.appendFileSync('square_webhook_log.txt', log);
}

app.post('/webhook', async (req, res) => {
  const data = req.body;
  logWebhook(data);

  const eventType = data.type || 'unknown';
  const object = data.data?.object || {};

  let alert = false;
  let message = '';

  if (eventType === 'payment.created') {
    const payment = object.payment || {};
    const amountCents = payment.amount_money?.amount || 0;
    const receipt_number = payment.receipt_number || 'UNKNOWN';
    const note = (payment.note || '').toLowerCase();

    if (note.includes('hookah')) {
      const amount = (amountCents / 100).toFixed(2);
      message = `🔥 Hookah purchase: Receipt #${receipt_number} - $${amount}`;
      alert = true;
    }
  }

  if (alert && smsRecipients.length > 0) {
    try {
      for (const recipient of smsRecipients) {
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: recipient,
        });
      }
      console.log('✅ Alert sent:', message);
      res.status(200).send('Alert sent');
    } catch (err) {
      console.error('❌ Failed to send SMS:', err);
      res.status(500).send('Failed to send SMS');
    }
  } else {
    res.status(200).send(`No alert triggered. Event: ${eventType}`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
