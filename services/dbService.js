const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("environment.db");
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS environment_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT (datetime('now')),
      temperature_in REAL,
      humidity_in REAL,
      dew_point_in REAL,
      heat_index_in REAL,
      temperature_out REAL,
      humidity_out REAL,
      pressure_out REAL,
      wind_speed_out REAL,
      weather_condition TEXT,
      weather_source TEXT,
      relay_status TEXT,
      relay_reason TEXT,
      location TEXT,
      prediction REAL,
      target_action INTEGER,
      model_version TEXT
    )
  `);
});

module.exports = db;
