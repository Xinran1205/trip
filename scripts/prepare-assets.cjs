const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const { icons } = require("lucide");
const site = path.join(__dirname, "../sanya_trip_site");

async function main() {
  await fs.mkdir(path.join(site, "vendor"), { recursive: true });
  await fs.mkdir(path.join(site, "assets/icons"), { recursive: true });
  const names = ["Navigation", "Copy", "Share2", "MapPin", "LocateFixed", "Star", "RefreshCw", "Download", "Check", "WifiOff", "X", "Expand", "LoaderCircle"];
  const packed = Object.fromEntries(names.map((name) => [name, icons[name].map(([tag, attrs]) =>
    `<${tag} ${Object.entries(attrs).map(([key, value]) => `${key}="${value}"`).join(" ")}></${tag}>`).join("")]));
  await fs.writeFile(path.join(site, "vendor/icons.js"), `/* Lucide 1.44.0, ISC license. See lucide-LICENSE. */\nwindow.TRIP_ICONS = ${JSON.stringify(packed)};\n`);
  await fs.copyFile(require.resolve("coordtransform"), path.join(site, "vendor/coordtransform.js"));
  for (const [name, license] of [["lucide", "LICENSE"], ["coordtransform", "LICENSE"]]) {
    await fs.copyFile(path.join(__dirname, `../node_modules/${name}/${license}`), path.join(site, `vendor/${name}-LICENSE`));
  }
  // Rasterize the site's existing favicon; preserve its established visual identity.
  const html = await fs.readFile(path.join(site, "index.html"), "utf8");
  const source = decodeURIComponent(html.match(/href="data:image\/svg\+xml,([^"]+)"/)[1]);
  for (const size of [180, 192, 512]) {
    await sharp(Buffer.from(source)).resize(size, size).png().toFile(path.join(site, `assets/icons/icon-${size}.png`));
  }
  await sharp(Buffer.from(source)).resize(360, 360).extend({ top: 76, bottom: 76, left: 76, right: 76, background: "#214e40" })
    .flatten({ background: "#214e40" }).png().toFile(path.join(site, "assets/icons/maskable-512.png"));
  const workerPath = path.join(site, "service-worker.js");
  const worker = await fs.readFile(workerPath, "utf8");
  const files = JSON.parse(worker.match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
  const hash = crypto.createHash("sha256");
  hash.update(worker.replace(/const VERSION = "[^"]+";/, "const VERSION = \"\";"));
  for (const file of files) hash.update(await fs.readFile(path.join(site, file)));
  const version = hash.digest("hex").slice(0, 16);
  await fs.writeFile(workerPath, worker.replace(/const VERSION = "[^"]+";/, `const VERSION = "${version}";`));
  console.log(`Offline shell version: ${version}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
