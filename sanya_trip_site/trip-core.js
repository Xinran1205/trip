(function (root) {
  "use strict";
  const validCoordinate = (point) => Array.isArray(point) && point.length === 2 &&
    point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;

  function haversine(from, to) {
    if (!validCoordinate(from) || !validCoordinate(to)) return null;
    const rad = (degrees) => degrees * Math.PI / 180;
    const [lng1, lat1] = from.map(rad);
    const [lng2, lat2] = to.map(rad);
    const a = Math.sin((lat2 - lat1) / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2;
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters) || meters < 0) return "距离未知";
    if (meters < 100) return "100 m 内";
    if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
    return `${(meters / 1000).toFixed(meters >= 100000 ? 0 : 1)} km`;
  }

  function amapURL(place, poi, navigation = false) {
    const located = validCoordinate(poi?.location);
    const url = new URL(`https://uri.amap.com/${located ? (navigation ? "navigation" : "marker") : "search"}`);
    url.searchParams.set("src", "sanya-trip");
    url.searchParams.set("callnative", "1");
    if (located) {
      url.searchParams.set("coordinate", "gaode");
      if (navigation) {
        url.searchParams.set("to", `${poi.location.join(",")},${poi.name || place.name}`);
        url.searchParams.set("mode", "car");
      } else {
        url.searchParams.set("position", poi.location.join(","));
        url.searchParams.set("name", poi.name || place.name);
      }
    } else {
      url.searchParams.set("keyword", place.amap);
      url.searchParams.set("city", "三亚");
    }
    return url.href;
  }

  function validPOI(poi, place, now = Date.now()) {
    return poi && poi.query === place.amap && typeof poi.name === "string" &&
      typeof poi.address === "string" && validCoordinate(poi.location) &&
      poi.location[0] >= 108.7 && poi.location[0] <= 110.1 &&
      poi.location[1] >= 18 && poi.location[1] <= 19 &&
      Number.isFinite(poi.savedAt) && poi.savedAt <= now + 60000 &&
      now - poi.savedAt < 30 * 24 * 60 * 60 * 1000;
  }

  function readObject(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key));
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }

  const api = { validCoordinate, haversine, formatDistance, amapURL, validPOI, readObject };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TripCore = api;
})(typeof window === "undefined" ? globalThis : window);
