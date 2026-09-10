const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const crypto = require("node:crypto");
const core = require("../sanya_trip_site/trip-core.js");
const transform = require("coordtransform");

test("Haversine handles zero, equator, antimeridian and antipodes", () => {
  assert.equal(core.haversine([109, 18], [109, 18]), 0);
  assert.ok(Math.abs(core.haversine([0, 0], [1, 0]) - 111195.08) < 1);
  assert.ok(Math.abs(core.haversine([179.5, 0], [-179.5, 0]) - 111195.08) < 1);
  assert.ok(Math.abs(core.haversine([0, 0], [180, 0]) - Math.PI * 6371008.8) < 1);
  for (const point of [null, [NaN, 18], [181, 0], [109, 91], ["109", 18]]) assert.equal(core.haversine(point, [0, 0]), null);
});
test("coordinate conversion prevents the China GPS offset", () => {
  const gps = [109.73, 18.37];
  const gcj = transform.wgs84togcj02(...gps);
  assert.ok(core.haversine(gps, gcj) > 300);
  assert.ok(core.haversine(gps, transform.gcj02towgs84(...gcj)) < 5);
});
test("navigation and sharing preserve coordinates and Unicode names", () => {
  const place = { name: "测试 & A", amap: "三亚 测试 & A" };
  const poi = { name: "测试 & A(海棠湾)", location: [109.7, 18.4] };
  const navigation = new URL(core.amapURL(place, poi, true));
  assert.equal(navigation.pathname, "/navigation");
  assert.equal(navigation.searchParams.get("to"), "109.7,18.4,测试 & A(海棠湾)");
  assert.equal(navigation.searchParams.get("coordinate"), "gaode");
  assert.equal(navigation.searchParams.get("callnative"), "1");
  assert.equal(new URL(core.amapURL(place, poi)).pathname, "/marker");
  assert.equal(new URL(core.amapURL(place, null)).searchParams.get("keyword"), place.amap);
});
test("invalid, stale or mismatched cached POIs are rejected", () => {
  const place = { amap: "查询" };
  const poi = { query: place.amap, name: "门店", address: "三亚", location: [109.7, 18.4], savedAt: Date.now() };
  assert.ok(core.validPOI(poi, place));
  for (const change of [{ query: "旧查询" }, { savedAt: 0 }, { savedAt: Date.now() + 120000 }, { location: [116, 40] }, { address: [] }]) assert.ok(!core.validPOI({ ...poi, ...change }, place));
  for (const value of ["{bad", "null", "[]", "1"]) assert.deepEqual(core.readObject({ getItem: () => value }, "x"), {});
  assert.deepEqual(core.readObject({ getItem() { throw new Error(); } }, "x"), {});
});
test("data IDs and completion keys are unique", () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../sanya_trip_site/trip-data.js"), "utf8"), context);
  const data = context.window.TRIP_DATA;
  const keys = data.days.flatMap((day) => day.events.map(([time]) => `${day.date}-${time}`));
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(new Set(data.places.map((p) => p.id)).size, data.places.length);
});
test("offline version matches all deployed shell content", () => {
  const site = path.join(__dirname, "../sanya_trip_site");
  const worker = fs.readFileSync(path.join(site, "service-worker.js"), "utf8");
  const files = JSON.parse(worker.match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
  const hash = crypto.createHash("sha256").update(worker.replace(/const VERSION = "[^"]+";/, 'const VERSION = "";'));
  files.forEach((file) => hash.update(fs.readFileSync(path.join(site, file))));
  assert.equal(worker.match(/const VERSION = "([^"]+)";/)[1], hash.digest("hex").slice(0, 16), "Run npm run prepare:assets after editing site files");
  const html = fs.readFileSync(path.join(site, "index.html"), "utf8");
  for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) assert.ok(files.includes(match[1]), `${match[1]} missing from offline shell`);
});
