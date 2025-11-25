const http = require("http");
const { handleRequest } = require("./controllers/router");
const PORT = 2000;

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
