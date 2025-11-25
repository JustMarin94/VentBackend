const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const {
  cachedWeather,
  lastFetchTime,
  CACHE_TTL,
} = require("../config/settings");

async function fetchOutsideWeather() {
  const now = Date.now();

  if (cachedWeather && now - lastFetchTime < CACHE_TTL) {
    console.log("✅ Using cached weather");
    return cachedWeather;
  }

  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=45.3267&longitude=14.4424&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code";
    const response = await fetch(url);
    const data = await response.json();
    const weather = data.current || {};

    const newWeather = {
      temperature_out: weather.temperature_2m,
      humidity_out: weather.relative_humidity_2m,
      pressure_out: weather.surface_pressure,
      wind_speed_out: weather.wind_speed_10m,
      weather_condition: weather.weather_code,
    };

    console.log("✅ Weather fetched and cached");
    return newWeather;
  } catch (err) {
    console.error("❌ Failed to fetch weather:", err.message);
    return {
      temperature_out: null,
      humidity_out: null,
      pressure_out: null,
      wind_speed_out: null,
      weather_condition: null,
    };
  }
}

module.exports = { fetchOutsideWeather };
