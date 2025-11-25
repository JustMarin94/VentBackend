const settings = require("../config/settings");

function relayController(req, res) {
  if (req.method === "GET" && req.url === "/api/relay") {
    console.log(
      `🔁 Relay info requested: State=${settings.relayState}, Mode=${settings.relayMode}`
    );
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(settings.relayState);
  } else if (req.method === "POST" && req.url === "/api/relay") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (settings.relayMode !== "MANUAL") {
          res.writeHead(403, { "Content-Type": "text/plain" });
          res.end("Relay can only be changed manually in MANUAL mode\n");
          return;
        }

        if (["ON", "OFF"].includes(data.state)) {
          settings.relayState = data.state;
          console.log(`⚙️ Relay manually set to: ${settings.relayState}`);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(settings.relayState);
        } else {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end('Invalid state. Use "ON" or "OFF"\n');
        }
      } catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON format\n");
      }
    });
  } else if (req.method === "GET" && req.url === "/api/relay/mode") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(settings.relayMode);
  } else if (req.method === "POST" && req.url === "/api/relay/mode") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (["AUTO", "MANUAL"].includes(data.mode)) {
          settings.relayMode = data.mode;
          console.log(`⚙️ Relay mode updated to: ${settings.relayMode}`);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(settings.relayMode);
        } else {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end('Invalid mode. Use "AUTO" or "MANUAL".\n');
        }
      } catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON format\n");
      }
    });
  }
}

module.exports = relayController;
