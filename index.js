const express = require('express');
const fs = require('fs');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // ✅ Middleware to parse JSON

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const smsRecipients = process.env.SMS_RECIPIENTS
  ? process.env.SMS_RECIPIENTS.split(',').map(num => num.trim())
  : [];

app.post('/webhook', async (req, res) => {
  console.log('📝 Webhook received:', JSON.stringify(req.body, null, 2));

  const payment = req.body?.data?.object?.payment;
  if (!payment) {
    return res.status(400).send('Invalid webhook payload');
  }

  const note = (payment.note || '').toLowerCase();
  const receipt_number = payment.receipt_number || 'UNKNOWN';
  const amountCents = payment.amount_money?.amount || 0;
  const amount = (amountCents / 100).toFixed(2);

  if (note.includes('hookah')) {
    const message = `🔥 Hookah purchase: Receipt #${receipt_number} - $${amount}`;
    console.log('📲 Sending SMS:', message);

    try {
      for (const recipient of smsRecipients) {
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: recipient,
        });
      }
      return res.status(200).send('Hookah purchase alert sent');
    } catch (err) {
      console.error('❌ SMS Error:', err);
      return res.status(500).send('Failed to send SMS');
    }
  }

  res.status(200).send('No hookah detected. No alert sent.');
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});
