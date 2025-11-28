// config/settings.js

// ---------------- Relay ----------------
let relayState = "OFF";
let relayMode = "AUTO"; // or "MANUAL"
const HUMIDITY_THRESHOLD = 55.0;

let serverConfig = {
  read_interval_ms: 5000,
  humidity_threshold: HUMIDITY_THRESHOLD,
};

// ---------------- Alarm ----------------
let alarmState = "OFF"; // <--- NEW (default OFF)
let alarmArmed = true;
let alarmAutoArmAt = 0;
let ALARM_DURATION_MS = 2000;

// ---------------- Motion ----------------
let motionDetected = false; // <--- NEW (motion flag)
let motionTimestamp = 0; // timestamp of last motion event

// ---------------- Weather Cache ----------------
let cachedWeather = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

module.exports = {
  // relay
  relayState,
  relayMode,
  serverConfig,

  // alarm
  alarmState,
  alarmArmed,
  alarmAutoArmAt,
  ALARM_DURATION_MS,

  // motion
  motionDetected,
  motionTimestamp,

  // weather cache
  cachedWeather,
  lastFetchTime,
  CACHE_TTL,
};
