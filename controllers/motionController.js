const settings = require("../config/settings");

function motionController(req, res) {
  if (req.method === "POST" && req.url === "/api/motion") {
    let body = "";

    req.on("data", (chunk) => (body += chunk));

    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        // Expect: { motion: 1 } or { motion: 0 }
        const motion = data.motion;

        if (motion !== 0 && motion !== 1) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Invalid motion data\n");
          return;
        }

        // Store motion state
        settings.motionDetected = motion === 1;
        settings.motionTimestamp = Date.now();

        console.log(motion ? "🚨 Motion detected" : "✔ Motion stopped");

        // -----------------------------
        // AUTO-TRIGGER ALARM ON MOTION
        // -----------------------------
        if (motion === 1) {
          settings.motionDetected = true;
          settings.motionTimestamp = Date.now();

          console.log("🚨 Motion detected");

          // Trigger alarm ONLY IF SYSTEM IS ARMED
          if (settings.alarmArmed) {
            if (settings.alarmState !== "ON") {
              settings.alarmState = "ON";
              console.log("🚨 Alarm AUTO-ON (motion + armed)");
            }
          }
        }

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Motion event received\n");
      } catch (err) {
        console.error("❌ Invalid JSON:", err.message);

        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON\n");
      }
    });
  }
}

module.exports = motionController;
