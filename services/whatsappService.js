const twilio = require("twilio");

// Load credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsApp = "whatsapp:+14155238886"; // Twilio sandbox number
const toWhatsApp = process.env.WHATSAPP_TO_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Send a WhatsApp message via Twilio
 * @param {string} message - The message text
 */
function sendWhatsApp(message) {
  client.messages
    .create({
      from: fromWhatsApp,
      to: toWhatsApp,
      body: message,
    })
    .then((msg) => {
      console.log(`📩 WhatsApp message sent! SID: ${msg.sid}`);
    })
    .catch((err) => {
      console.error("❌ Error sending WhatsApp message:", err.message);
    });
}

module.exports = { sendWhatsApp };
