const http = require("http");
const fs = require("fs");
const server = http.createServer((req, res) => {
	console.log(`${new Date} ${req.method} ${req.url}`);
	setTimeout(() => {
		res.setHeader("Cache-Control", "public, max-age=31536000");
		res.end(fs.readFileSync(__dirname + "/test.png"), "image/png");
	}, 1000);
});
server.listen(8080);
process.on("SIGINT", () => {
	process.exit();
});
require("node-sigint");
