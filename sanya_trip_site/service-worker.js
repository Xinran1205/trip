"use strict";
// Generated from the shell contents by npm run prepare:assets.
const VERSION = "62b812de2209ed75";
const SHELL = [
  "index.html", "styles.css", "trip-data.js", "trip-core.js", "app.js",
  "travel-map.js", "pwa.js", "manifest.json", "vendor/icons.js",
  "vendor/coordtransform.js", "assets/coast.jpg", "assets/icons/icon-180.png",
  "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/maskable-512.png"
];
const BASE = new URL("./", self.location.href);
const PREFIX = `sanya-trip:${BASE.pathname}:`;
const CACHE = `${PREFIX}${VERSION}`;
const urls = SHELL.map((file) => new URL(file, BASE).href);
const shellURLs = new Set(urls);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const hadUsableCache = await caches.has(CACHE);
    const cache = await caches.open(CACHE);
    try {
      // Fetch all resources before publishing the new version; never mix partial updates.
      const responses = await Promise.all(urls.map(async (url) => {
        const response = await fetch(new Request(url, { cache: "reload" }));
        if (!response.ok || response.redirected) throw new Error(`Shell fetch failed: ${url}`);
        const type = response.headers.get("Content-Type") || "";
        if (!url.endsWith(".html") && type.includes("text/html")) throw new Error(`Unexpected HTML: ${url}`);
        return response;
      }));
      await Promise.all(urls.map((url, index) => cache.put(url, responses[index])));
    } catch (error) { if (!hadUsableCache) await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(PREFIX) && name !== CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") event.waitUntil(self.skipWaiting());
  if (event.data?.type === "CHECK_OFFLINE") {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      const ready = (await Promise.all(urls.map((url) => cache.match(url)))).every(Boolean);
      event.ports[0]?.postMessage({ ready, version: VERSION });
    })());
  }
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== BASE.origin) return; // Map SDK, tiles and POI responses stay online-only.
  url.search = ""; url.hash = "";
  const home = request.mode === "navigate" && (url.href === BASE.href || url.href === new URL("index.html", BASE).href);
  const key = home ? new URL("index.html", BASE).href : url.href;
  if (!home && !shellURLs.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key);
    if (cached) return cached;
    return fetch(request);
  })());
});
