// config/settings.js

// Relay state stored in memory (default OFF)
let relayState = "OFF";
let relayMode = "AUTO"; // or "MANUAL"
const HUMIDITY_THRESHOLD = 55.0; // default threshold

let serverConfig = {
  read_interval_ms: 5000, // default 5s
  humidity_threshold: HUMIDITY_THRESHOLD,
};

// In-memory cache
let cachedWeather = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

module.exports = {
  relayState,
  relayMode,
  serverConfig,
  cachedWeather,
  lastFetchTime,
  CACHE_TTL,
};
