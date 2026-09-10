const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg" };
function createServer(root = path.join(__dirname, "../sanya_trip_site"), overrides = new Map()) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let relative = decodeURIComponent(url.pathname).replace(/^\//, "");
      if (relative.startsWith("trip/")) relative = relative.slice(5);
      if (!relative || relative.endsWith("/")) relative += "index.html";
      const file = path.resolve(root, relative);
      if (!file.startsWith(path.resolve(root) + path.sep)) { res.writeHead(403).end(); return; }
      if (overrides.get(relative) === null) { res.writeHead(503).end(); return; }
      const body = overrides.has(relative) ? overrides.get(relative) : await fs.readFile(file);
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(body);
    } catch { res.writeHead(404).end("Not found"); }
  });
}
if (require.main === module) {
  const port = Number(process.env.TRIP_PREVIEW_PORT || 4173);
  const server = createServer();
  server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => console.log(`Sanya preview: http://127.0.0.1:${port}/`));
}
module.exports = { createServer };
