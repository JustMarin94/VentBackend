const db = require("../services/dbService");

function dataController(req, res) {
  if (req.method === "GET" && req.url === "/api/data") {
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
}

module.exports = dataController;
