const db = require("../services/dbService");
const { fetchOutsideWeather } = require("../services/weatherService");
const {
  calculateDewPoint,
  calculateHeatIndex,
} = require("../utils/calculations");
const settings = require("../config/settings");

function sensorController(req, res) {
  if (req.method === "POST" && req.url === "/api/sensor") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const humidity_in = data.humidity;
        const temperature_in = data.temperature;

        if (
          humidity_in == null ||
          temperature_in == null ||
          humidity_in < 0 ||
          humidity_in > 100
        ) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Invalid sensor data\n");
          return;
        }

        const dew_point_in = calculateDewPoint(temperature_in, humidity_in);
        const heat_index_in = calculateHeatIndex(temperature_in, humidity_in);

        const weather = await fetchOutsideWeather();
        const temperature_out = weather.temperature_out ?? null;
        const humidity_out = weather.humidity_out ?? null;
        const pressure_out = weather.pressure_out ?? null;
        const wind_speed_out = weather.wind_speed_out ?? null;
        const weather_condition = weather.weather_condition ?? null;
        const dew_point_out =
          temperature_out !== null && humidity_out !== null
            ? calculateDewPoint(temperature_out, humidity_out)
            : null;

        let relay_reason = "No change";
        const HYSTERESIS = 2;

        if (settings.relayMode === "AUTO") {
          if (
            humidity_in >
            settings.serverConfig.humidity_threshold + HYSTERESIS
          ) {
            if (
              humidity_out !== null &&
              humidity_in > humidity_out &&
              dew_point_in > (dew_point_out ?? -Infinity)
            ) {
              if (settings.relayState !== "ON") {
                settings.relayState = "ON";
                relay_reason = `Auto ON: inside humidity high (${humidity_in}%)`;
              }
            }
          } else if (
            humidity_in <
            settings.serverConfig.humidity_threshold - HYSTERESIS
          ) {
            if (settings.relayState !== "OFF") {
              settings.relayState = "OFF";
              relay_reason = `Auto OFF: inside humidity low (${humidity_in}%)`;
            }
          }
        } else {
          relay_reason = "Manual mode active";
        }

        const location = "Shed";
        db.run(
          `INSERT INTO environment_data
           (temperature_in, humidity_in, dew_point_in, heat_index_in,
            temperature_out, humidity_out, pressure_out, wind_speed_out, weather_condition,
            relay_status, relay_reason, weather_source, location)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            temperature_in,
            humidity_in,
            dew_point_in,
            heat_index_in,
            temperature_out,
            humidity_out,
            pressure_out,
            wind_speed_out,
            weather_condition,
            settings.relayState,
            relay_reason,
            "Open-Meteo",
            location,
          ],
          (err) => {
            if (err) console.error("❌ DB insert error:", err.message);
            else console.log("✅ Data saved to database.");
          }
        );

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Sensor data received\n");
      } catch (err) {
        console.error("❌ Invalid JSON:", err.message);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON\n");
      }
    });
  }
}

module.exports = sensorController;
