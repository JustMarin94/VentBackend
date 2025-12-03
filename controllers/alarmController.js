const settings = require("../config/settings");

function alarmController(req, res) {
  // -------------------- GET /api/alarm --------------------
  if (req.method === "GET" && req.url === "/api/alarm") {
    // AUTO-OFF AFTER DURATION
    if (settings.alarmState === "ON") {
      const elapsed = Date.now() - settings.motionTimestamp;
      if (elapsed > settings.ALARM_DURATION_MS) {
        settings.alarmState = "OFF";
        console.log("🔇 Alarm AUTO-OFF (duration expired)");
      }
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(settings.alarmState || "OFF"); // default OFF
    return;
  }

  // GET current armed state
  if (req.method === "GET" && req.url === "/api/alarmArmed") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ armed: settings.alarmArmed }));
    return;
  }

  // POST new armed state
  if (req.method === "POST" && req.url === "/api/alarmArmed") {
    let body = "";

    req.on("data", (chunk) => (body += chunk));

    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        if (typeof data.armed !== "boolean") {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Invalid value\n");
          return;
        }

        settings.alarmManual = true;
        settings.alarmArmed = data.armed;

        console.log(
          settings.alarmArmed ? "🔒 Alarm ARMED" : "🔓 Alarm DISARMED"
        );

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Armed state updated\n");
      } catch (err) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON\n");
      }
    });

    return;
  }

  // POST /api/alarmDeactivateTimed
  if (req.method === "POST" && req.url === "/api/alarmDeactivateTimed") {
    let body = "";

    req.on("data", (chunk) => (body += chunk));

    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        if (typeof data.minutes !== "number") {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Invalid minutes\n");
          return;
        }

        const durationMs = data.minutes * 60 * 1000;

        settings.alarmArmed = false;
        settings.alarmAutoArmAt = Date.now() + durationMs;

        console.log(`🔓 Alarm DISARMED for ${data.minutes} minutes`);

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Alarm temporarily disarmed\n");
      } catch (err) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON\n");
      }
    });

    return;
  }
}

module.exports = alarmController;
