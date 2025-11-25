const sensorController = require("./sensorController");
const relayController = require("./relayController");
const configController = require("./configController");
const dataController = require("./dataController");

function handleRequest(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url.startsWith("/api/sensor")) return sensorController(req, res);
  if (req.url.startsWith("/api/relay")) return relayController(req, res);
  if (req.url.startsWith("/api/config")) return configController(req, res);
  if (req.url.startsWith("/api/data")) return dataController(req, res);

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found\n");
}

module.exports = { handleRequest };
