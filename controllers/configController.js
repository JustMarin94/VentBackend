const { serverConfig } = require("../config/settings");

function configController(req, res) {
  if (req.method === "GET" && req.url === "/api/config") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(serverConfig));
  } else if (req.method === "POST" && req.url === "/api/config") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        if (data.read_interval_ms !== undefined)
          serverConfig.read_interval_ms = parseInt(data.read_interval_ms);

        if (data.humidity_threshold !== undefined)
          serverConfig.humidity_threshold = parseFloat(data.humidity_threshold);

        console.log("⚙️ Server config updated:", serverConfig);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(serverConfig));
      } catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON\n");
      }
    });
  }
}

module.exports = configController;
