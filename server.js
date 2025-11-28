// server.js (main entry point)
const http = require("http");
require("dotenv").config();
const { handleRequest } = require("./controllers/router");
const settings = require("./config/settings");
const { sendWhatsApp } = require("./services/whatsappService");

const PORT = 2000;

let lastAlarmState = settings.alarmState;
// ---------------------------
// Internal Auto-Rearm Interval
// ---------------------------
setInterval(() => {
  if (!settings.alarmArmed && settings.alarmAutoArmAt > 0) {
    if (Date.now() >= settings.alarmAutoArmAt) {
      settings.alarmArmed = true;
      settings.alarmAutoArmAt = 0;
      console.log("⏱️ Auto-ARM: Time window expired (internal clock)");
    }
  }

  // Detect alarm state change
  if (settings.alarmState === "ON" && lastAlarmState !== "ON") {
    console.log("🚨 Alarm triggered! Sending WhatsApp message...");
    sendWhatsApp("Alert: Alarm triggered!"); // call your WhatsApp API here
  }

  lastAlarmState = settings.alarmState;
}, 1000); // check every second

// ---------------------------
// Create HTTP server
// ---------------------------
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
