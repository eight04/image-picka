/* eslint-env node */
/* eslint no-console: 0 */

const http = require("http");
const fs = require("fs");
const {Throttle} = require("stream-throttle");
const server = http.createServer((req, res) => {
	console.log(`${new Date} ${req.method} ${req.url}`);
	const image = fs.createReadStream(__dirname + "/test.png");
	res.writeHead(200, {
		"Content-Type": "image/png",
		"Cache-Control": "public, max-age=31536000"
	});
	image.pipe(new Throttle({rate: 100})).pipe(res);
});
server.listen(8080);
process.on("SIGINT", () => {
	process.exit();
});
require("node-sigint");
