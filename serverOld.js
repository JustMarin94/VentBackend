// server.js
const http = require("http");
const sqlite3 = require("sqlite3").verbose();
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const PORT = 2000;

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
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Database setup
const db = new sqlite3.Database("environment.db");
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS environment_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT (datetime('now')),

      -- Inside readings
      temperature_in REAL,
      humidity_in REAL,
      dew_point_in REAL,
      heat_index_in REAL,

      -- Outside readings
      temperature_out REAL,
      humidity_out REAL,
      pressure_out REAL,
      wind_speed_out REAL,
      weather_condition TEXT,
      weather_source TEXT,

      -- System control
      relay_status TEXT,
      relay_reason TEXT,
      location TEXT,

      -- ML tracking (for future use)
      prediction REAL,
      target_action INTEGER,
      model_version TEXT
    )
  `);
});

async function fetchOutsideWeather() {
  const now = Date.now();

  // Check if cache is still valid
  if (cachedWeather && now - lastFetchTime < CACHE_TTL) {
    console.log("✅ Using cached weather");
    return cachedWeather;
  }

  // Cache expired or empty → fetch new data
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=45.3267&longitude=14.4424&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code";
    const response = await fetch(url);
    const data = await response.json();
    const weather = data.current || {};

    cachedWeather = {
      temperature_out: weather.temperature_2m,
      humidity_out: weather.relative_humidity_2m,
      pressure_out: weather.surface_pressure,
      wind_speed_out: weather.wind_speed_10m,
      weather_condition: weather.weather_code,
    };
    lastFetchTime = now;

    console.log("✅ Weather fetched and cached");
    return cachedWeather;
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

function calculateDewPoint(t, h) {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * t) / (b + t) + Math.log(h / 100);
  return (b * alpha) / (a - alpha);
}

function calculateHeatIndex(t, h) {
  return (
    -8.784695 +
    1.61139411 * t +
    2.338549 * h -
    0.14611605 * t * h -
    0.012308094 * t * t -
    0.016424828 * h * h +
    0.002211732 * t * t * h +
    0.00072546 * t * h * h -
    0.000003582 * t * t * h * h
  );
}

const server = http.createServer((req, res) => {
  // Enable CORS (so browser/ESP32 can access it)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route: POST /api/sensor → receive humidity & temp
  if (req.method === "POST" && req.url === "/api/sensor") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);

        const humidity_in = data.humidity;
        const temperature_in = data.temperature;

        console.log(
          `📡 Sensor Data Received: Humidity: ${humidity_in}%, Temperature: ${temperature_in}°C`
        );

        // Validate sensor readings
        if (
          humidity_in == null ||
          temperature_in == null ||
          humidity_in < 0 ||
          humidity_in > 100
        ) {
          console.error("⚠️ Invalid sensor data, skipping insert.");
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Invalid sensor data\n");
          return;
        }

        // Calculate inside metrics
        const dew_point_in = calculateDewPoint(temperature_in, humidity_in);
        const heat_index_in = calculateHeatIndex(temperature_in, humidity_in);

        // Fetch outside weather
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
        // Relay control logic with hysteresis and outside check
        if (relayMode === "AUTO") {
          // Existing automatic logic with humidity/dew point
          const HYSTERESIS = 2;

          if (humidity_in > serverConfig.humidity_threshold + HYSTERESIS) {
            if (
              humidity_out !== null &&
              humidity_in > humidity_out &&
              dew_point_in > (dew_point_out ?? -Infinity)
            ) {
              if (relayState !== "ON") {
                relayState = "ON";
                relay_reason = `Auto ON: inside humidity high (${humidity_in}%)`;
              }
            } else {
              relay_reason = `Not activating relay: outside conditions`;
            }
          } else if (
            humidity_in <
            serverConfig.humidity_threshold - HYSTERESIS
          ) {
            if (relayState !== "OFF") {
              relayState = "OFF";
              relay_reason = `Auto OFF: inside humidity low (${humidity_in}%)`;
            }
          }
        } else {
          relay_reason = `Manual mode active`;
        }

        // Insert into database
        const location = "Shed";
        db.run(
          `
        INSERT INTO environment_data
        (temperature_in, humidity_in, dew_point_in, heat_index_in,
         temperature_out, humidity_out, pressure_out, wind_speed_out, weather_condition,
         relay_status, relay_reason, weather_source, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
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
            relayState,
            relay_reason,
            "Open-Meteo",
            location,
          ],
          (err) => {
            if (err) console.error("❌ DB insert error:", err.message);
            else console.log("✅ Data saved to database.");
          }
        );
      } catch (err) {
        console.error("❌ Invalid JSON:", err.message);
      }

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Sensor data received\n");
    });
  }

  // GET /api/config
  else if (req.method === "GET" && req.url === "/api/config") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(serverConfig));
  }

  // POST new config
  else if (req.method === "POST" && req.url === "/api/config") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        // Update only the values sent
        if (data.read_interval_ms !== undefined) {
          serverConfig.read_interval_ms = parseInt(data.read_interval_ms);
        }
        if (data.humidity_threshold !== undefined) {
          serverConfig.humidity_threshold = parseFloat(data.humidity_threshold);
        }

        console.log("⚙️ Server config updated:", serverConfig);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(serverConfig));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON\n");
      }
    });
  }

  // Route: GET /api/relay  → send current relay state
  else if (req.method === "GET" && req.url === "/api/relay") {
    console.log(
      `🔁 Relay info requested: State=${relayState}, Mode=${relayMode}`
    );

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(relayState); // just "ON" or "OFF"
  }

  // Route: POST /api/relay  → update relay state
  else if (req.method === "POST" && req.url === "/api/relay") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        if (relayMode !== "MANUAL") {
          res.writeHead(403, { "Content-Type": "text/plain" });
          res.end("Relay can only be changed manually in MANUAL mode\n");
          return;
        }

        if (data.state === "ON" || data.state === "OFF") {
          relayState = data.state;
          console.log(`⚙️ Relay manually set to: ${relayState}`);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(relayState); // confirm
        } else {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end('Invalid state. Use "ON" or "OFF"\n');
        }
      } catch (err) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON format\n");
      }
    });

    // Route: GET /api/relay/mode  → get current relay mode
  } else if (req.method === "GET" && req.url === "/api/relay/mode") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(relayMode);

    // Route: POST /api/relay/mode  → set relay mode
  } else if (req.method === "POST" && req.url === "/api/relay/mode") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (data.mode === "AUTO" || data.mode === "MANUAL") {
          relayMode = data.mode;
          console.log(`⚙️ Relay mode updated to: ${relayMode}`);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(relayMode);
        } else {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end('Invalid mode. Use "AUTO" or "MANUAL".\n');
        }
      } catch (err) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON format\n");
      }
    });
  }

  // === GET /api/data (view last 10 readings) ===
  else if (req.method === "GET" && req.url === "/api/data") {
    db.all(
      "SELECT * FROM environment_data ORDER BY timestamp DESC LIMIT 10",
      (err, rows) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(rows, null, 2));
        }
      }
    );
  }

  // Any other route
  else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found\n");
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   → POST /api/sensor (send humidity/temp)`);
  console.log(`   → GET /api/relay (get relay state)`);
  console.log(`   → POST /api/relay (set relay state to ON/OFF)`);
  console.log(`   → GET  /api/data  (latest readings)`);
});
