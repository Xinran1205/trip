(() => {
  "use strict";
  const { $, escapeHTML: esc, icon, toast, read, save, dialog, copy } = window.TripUI;
  const core = window.TripCore;
  const places = window.TRIP_DATA.places.map((place, index) => ({ ...place, index }));
  const favoriteKey = "sanya-favorites-v1", poiKey = "sanya-pois-v1";
  let favorites = read(favoriteKey);
  const poiCache = read(poiKey);
  const pois = new Map(places.filter((place) => core.validPOI(poiCache[place.id], place)).map((place) => [place.id, poiCache[place.id]]));
  const candidates = new Map(), markers = new Map();
  let activeFilter = "all", activeArea = "all", activePlace = null;
  let map = null, infoWindow = null, userMarker = null, accuracyCircle = null;
  let mapReady = false, loading = false, generation = 0, loaderPromise = null;
  let userPosition = null, locating = false, locationAttempt = 0;
  let locationTimer = null, staleTimer = null;
  const isFavorite = (place) => favorites[place.id] !== false;
  const status = (message) => { $("#map-status").textContent = message; };
  const freshPosition = () => userPosition && Date.now() - userPosition.timestamp < 300000;
  const branchNoise = /(入口|出口|停车场|地下停车场|地上停车场|充电站|卫生间|售票处|游客中心|接送点|落客区|上客区|服务台|公交站|地铁站|公交车站)/;
  const canonical = (value) => String(value || "")
    .replace(/\s+/g, "")
    .replace(/[·・•]/g, "")
    .replace(/[（）]/g, (match) => match === "（" ? "(" : ")")
    .replace(/三亚市|三亚|海南省|海南/g, "")
    .toLowerCase();
  const matches = (place) => (activeFilter === "all" || activeFilter === place.type) &&
    (activeArea === "all" || activeArea === place.area) && (!$("#favorites-only").checked || isFavorite(place));
  function distance(place) {
    const poi = pois.get(place.id);
    if (!userPosition || !poi) return null;
    // Browser GPS is WGS84; convert the GCJ02 POI before calculating distance.
    return core.haversine(userPosition.wgs84, window.coordtransform.gcj02towgs84(...poi.location));
  }
  function visiblePlaces() {
    const visible = places.filter(matches);
    if ($("#place-sort").value === "distance" && userPosition) {
      visible.sort((a, b) => (distance(a) ?? Infinity) - (distance(b) ?? Infinity) || a.index - b.index);
    }
    return visible;
  }
  function renderPlaces() {
    const focused = document.activeElement?.closest("#places [data-action]");
    const restore = focused && { id: focused.dataset.id, action: focused.dataset.action };
    const visible = visiblePlaces();
    $("#place-count").textContent = `${visible.length} / ${places.length} 地点`;
    $("#places").innerHTML = visible.map((place) => {
      const poi = pois.get(place.id), meters = distance(place), favorite = isFavorite(place);
      return `<article class="place${activePlace === place.id ? " active" : ""}" data-place-id="${place.id}">
        <div class="place-heading"><button type="button" class="place-select" data-action="select" data-id="${place.id}" aria-pressed="${activePlace === place.id}" aria-label="在地图中查看${esc(place.name)}"><span class="place-number">${String(place.index + 1).padStart(2, "0")}</span><span class="place-copy"><span class="place-category">${esc(place.category)}</span><strong>${esc(place.name)}</strong><small>${esc(place.note)}</small></span></button>
        <button type="button" class="icon-button favorite-button${favorite ? " saved" : ""}" data-action="favorite" data-id="${place.id}" aria-pressed="${favorite}" aria-label="${favorite ? "取消收藏" : "收藏"}${esc(place.name)}" title="${favorite ? "取消收藏" : "收藏"}">${icon("Star")}</button></div>
        <div class="place-detail">${userPosition ? `<span class="place-distance">${meters === null ? "距离待确认" : `${freshPosition() ? "距你" : "距上次位置"} ${core.formatDistance(meters)}`}</span>` : ""}
        ${poi && poi.name !== place.name ? `<span class="poi-name">${esc(poi.name)}</span>` : ""}<p class="place-address">${esc(poi?.address || "地址待确认")}</p>
        ${candidates.has(place.id) ? `<button type="button" class="confirm-place" data-action="confirm" data-id="${place.id}">${poi ? "更换门店" : "确认门店"}</button>` : ""}</div>
        <div class="place-actions"><a class="place-navigation" data-action="navigate" data-id="${place.id}" href="${esc(core.amapURL(place, poi, true))}" target="_blank" rel="noopener noreferrer">${icon("Navigation")}${poi ? "高德导航" : "高德搜索"}</a>
        <button type="button" class="icon-button" data-action="copy" data-id="${place.id}" ${poi?.address ? "" : "disabled"} aria-label="复制${esc(place.name)}地址" title="${poi?.address ? "复制地址" : "地址待确认"}">${icon("Copy")}</button>
        <button type="button" class="icon-button" data-action="share" data-id="${place.id}" aria-label="分享${esc(place.name)}" title="分享地点">${icon("Share2")}</button></div></article>`;
    }).join("") || `<p class="empty-places">${$("#favorites-only").checked ? "这个范围还没有收藏地点。" : "这个范围暂无地点。"}</p>`;
    if (restore) ($(`#places [data-action="${restore.action}"][data-id="${restore.id}"]`) || $("#places")).focus({ preventScroll: true });
    renderNearest();
  }
  function renderNearest() {
    const target = $("#nearest-place"), list = places.filter(isFavorite);
    const located = list.map((place) => ({ place, meters: distance(place) })).filter((entry) => entry.meters !== null).sort((a, b) => a.meters - b.meters);
    target.hidden = !userPosition; target.disabled = !located.length;
    if (!userPosition) return;
    if (!located.length) { target.textContent = list.length ? "收藏地点的坐标尚未确认" : "还没有收藏地点"; delete target.dataset.id; return; }
    const nearest = located[0];
    const uncertain = userPosition.accuracy > 500 || (located[1] && located[1].meters - nearest.meters < userPosition.accuracy * 2);
    const label = !freshPosition() ? "上次位置附近的收藏" : uncertain ? "附近收藏 · 定位精度有限" : "最近的收藏";
    target.dataset.id = nearest.place.id;
    target.innerHTML = `<span>${icon("MapPin")}<small>${label} · 已比较 ${located.length}/${list.length}</small></span><strong>${esc(nearest.place.name)}<b>${core.formatDistance(nearest.meters)}</b></strong>`;
  }
  function syncFilters() {
    document.querySelectorAll("[data-filter], [data-area]").forEach((button) => {
      const active = button.dataset.filter ? button.dataset.filter === activeFilter : button.dataset.area === activeArea;
      button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active));
    });
    renderPlaces(); focusMarkers();
  }
  function focusMarkers() {
    if (!mapReady) return;
    infoWindow?.close();
    const visible = [];
    places.forEach((place) => {
      const marker = markers.get(place.id);
      if (!marker) return;
      if (matches(place)) { marker.show(); visible.push(marker); } else marker.hide();
    });
    if (visible.length) map.setFitView(visible, false, [85, 50, 80, 50], 14);
    status(`当前范围已定位 ${visible.length}/${visiblePlaces().length} 个地点`);
  }
  function refocusAfterSearch() {
    if (!mapReady) return;
    if (activePlace && pois.has(activePlace)) { selectPlace(activePlace); return; }
    if (userPosition) { paintUserLocation(true); return; }
    focusMarkers();
  }
  function selectPlace(id, reveal = false) {
    const place = places.find((entry) => entry.id === id);
    if (!place) return;
    if (reveal || !matches(place)) { activeFilter = "all"; activeArea = "all"; $("#favorites-only").checked = false; syncFilters(); }
    activePlace = id; renderPlaces();
    if (reveal || window.matchMedia("(max-width:760px)").matches) $("#explore").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches ? "instant" : "smooth" });
    const poi = pois.get(id);
    if (!navigator.onLine) { status("当前离线，地点详情仍可查看"); return; }
    if (!mapReady || !poi) { status(loading ? "正在查找地点，请稍候。" : "地点尚未定位，可通过高德搜索确认。"); return; }
    markers.get(id)?.show(); map.setZoomAndCenter(15, poi.location);
    infoWindow.setContent(`<div class="map-info"><strong>${esc(poi.name)}</strong><span>${esc(poi.address)}</span><br><a target="_blank" rel="noopener noreferrer" href="${esc(core.amapURL(place, poi, true))}">高德导航</a></div>`);
    infoWindow.open(map, poi.location); status(`正在查看：${poi.name}`);
  }
  function savePOI(place, poi) {
    pois.set(place.id, poi); poiCache[place.id] = poi; save(poiKey, poiCache); addMarker(place);
  }
  function chooseCandidate(place, options) {
    if (!options.length) return null;
    const query = canonical(place.amap), name = canonical(place.name);
    const mainOptions = options.filter((poi) => !branchNoise.test(poi.name));
    const exact = mainOptions.filter((poi) => {
      const value = canonical(poi.name);
      return value === query || value === name || value.startsWith(`${name}(`) || value.startsWith(`${query}(`);
    });
    return exact.length === 1 ? exact[0] : options.length === 1 ? options[0] : null;
  }
  function confirmPlace(place) {
    dialog(`确认${place.name}`, `<p>选择这次想去的门店</p><div class="poi-options">${(candidates.get(place.id) || []).map((poi, index) =>
      `<button type="button" class="poi-option" data-candidate="${index}" data-id="${place.id}"><strong>${esc(poi.name)}</strong><span>${esc(poi.address || "地址未提供")}</span></button>`).join("")}</div>`);
  }
  $("#dialog-content").addEventListener("click", (event) => {
    const button = event.target.closest("[data-candidate]");
    if (!button) return;
    const place = places.find((entry) => entry.id === button.dataset.id);
    const poi = candidates.get(place.id)?.[Number(button.dataset.candidate)];
    if (!poi) return;
    savePOI(place, { ...poi, confirmed: true, savedAt: Date.now() });
    $("#trip-dialog").close(); selectPlace(place.id);
  });
  $("#places").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const place = places.find((entry) => entry.id === button.dataset.id);
    if (!place) return;
    const poi = pois.get(place.id);
    switch (button.dataset.action) {
      case "select": selectPlace(place.id); break;
      case "favorite": favorites[place.id] = !isFavorite(place); save(favoriteKey, favorites); renderPlaces(); focusMarkers(); break;
      case "confirm": confirmPlace(place); break;
      case "copy": if (poi?.address) await copy(`${poi.name}\n${poi.address}`, "地址已复制"); break;
      case "share": {
        const shared = { title: poi?.name || place.name, text: `${poi?.name || place.name}${poi?.address ? `\n${poi.address}` : ""}`, url: core.amapURL(place, poi) };
        if (navigator.share) {
          try { await navigator.share(shared); return; }
          catch (error) { if (error.name === "AbortError") return; }
        }
        await copy(`${shared.text}\n${shared.url}`, "地点分享内容已复制"); break;
      }
      case "navigate": if (!navigator.onLine) { event.preventDefault(); toast("当前离线；恢复网络后可打开高德导航。"); } break;
    }
  });
  $(".map-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (button) { activePlace = null; activeFilter = button.dataset.filter; syncFilters(); }
  });
  $(".area-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-area]");
    if (button) { activePlace = null; activeArea = button.dataset.area; syncFilters(); }
  });
  $("#favorites-only").addEventListener("change", () => { activePlace = null; syncFilters(); });
  $("#place-sort").addEventListener("change", renderPlaces);
  $("#hotels").addEventListener("click", (event) => {
    const button = event.target.closest("[data-place-id]");
    if (button) selectPlace(button.dataset.placeId, true);
  });
  $("#nearest-place").addEventListener("click", () => selectPlace($("#nearest-place").dataset.id, true));
  $("#map-reset").addEventListener("click", () => {
    activePlace = null; activeFilter = "all"; activeArea = "all";
    $("#favorites-only").checked = false; $("#place-sort").value = "original"; syncFilters();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === favoriteKey || event.key === null) { favorites = read(favoriteKey); renderPlaces(); focusMarkers(); }
  });

  function renderLocation() {
    $("#locate-me").disabled = locating;
    $("#locate-me span").textContent = locating ? "正在定位" : userPosition ? "更新位置" : "获取当前位置";
    $("#locate-me").setAttribute("aria-busy", String(locating));
    $("#clear-location").hidden = !userPosition && !locating;
    $("#place-sort option[value=distance]").disabled = !userPosition;
    if (userPosition) {
      const time = new Date(userPosition.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
      $("#location-title").textContent = freshPosition() ? "你现在在这里" : "上次获取的位置";
      $("#location-detail").textContent = `${time} 更新 · 定位精度约 ${Math.max(1, Math.round(userPosition.accuracy))} m${userPosition.accuracy > 500 ? " · 距离仅供参考" : ""}`;
    }
    renderPlaces();
  }
  function paintUserLocation(center = false) {
    if (!mapReady || !userPosition) return;
    const position = window.coordtransform.wgs84togcj02(...userPosition.wgs84);
    if (!userMarker) {
      userMarker = new window.AMap.Marker({ position, anchor: "center", zIndex: 200, content: '<div class="user-marker"><span></span><b>你</b></div>', title: "当前位置" });
      accuracyCircle = new window.AMap.Circle({ center: position, radius: userPosition.accuracy, strokeColor: "#2b76cf", strokeOpacity: 0.3, strokeWeight: 1, fillColor: "#2b76cf", fillOpacity: 0.09 });
      map.add([accuracyCircle, userMarker]);
    } else { userMarker.setPosition(position); accuracyCircle.setCenter(position); accuracyCircle.setRadius(userPosition.accuracy); }
    userMarker.setTitle(freshPosition() ? "当前位置" : "上次位置");
    userMarker.setContent(`<div class="user-marker"><span></span><b>${freshPosition() ? "你" : "上次位置"}</b></div>`);
    if (center) { infoWindow?.close(); map.setZoomAndCenter(userPosition.accuracy > 1000 ? 11 : 14, position); }
  }
  function clearLocation() {
    ++locationAttempt; clearTimeout(locationTimer); clearTimeout(staleTimer);
    locating = false; userPosition = null;
    if (mapReady) { if (userMarker) map.remove(userMarker); if (accuracyCircle) map.remove(accuracyCircle); }
    userMarker = null; accuracyCircle = null; $("#place-sort").value = "original";
    $("#location-title").textContent = "此刻，你在哪里"; $("#location-detail").textContent = "尚未获取位置"; renderLocation();
  }
  $("#clear-location").addEventListener("click", clearLocation);
  $("#locate-me").addEventListener("click", () => {
    if (locating) return;
    if (!window.isSecureContext) { $("#location-detail").textContent = "当前连接不支持定位，请使用 HTTPS 地址访问。"; return; }
    if (!navigator.geolocation) { $("#location-detail").textContent = "此浏览器不支持定位，可直接使用高德导航。"; return; }
    const attempt = ++locationAttempt; locating = true; renderLocation();
    $("#location-detail").textContent = "正在获取位置，请允许浏览器访问定位。";
    const failure = (error) => {
      if (attempt !== locationAttempt) return;
      ++locationAttempt; clearTimeout(locationTimer); locating = false;
      if (error.code === 1) clearLocation(); else renderLocation();
      const messages = { 1: "定位权限未获允许，请在浏览器站点设置中开启后重试。", 2: "暂时无法获取位置，请检查设备定位服务后重试。", 3: "定位超时，请到信号较好的位置重试。" };
      $("#location-detail").textContent = (messages[error.code] || "定位失败，请重试。") + (userPosition ? " 距离仍基于上次位置。" : "");
    };
    locationTimer = setTimeout(() => failure({ code: 3 }), 20000);
    try {
      navigator.geolocation.getCurrentPosition((position) => {
        if (attempt !== locationAttempt) return;
        const wgs84 = [position.coords.longitude, position.coords.latitude];
        if (!core.validCoordinate(wgs84) || !Number.isFinite(position.coords.accuracy) || position.coords.accuracy < 0) { failure({ code: 2 }); return; }
        ++locationAttempt; clearTimeout(locationTimer); clearTimeout(staleTimer); locating = false;
        userPosition = { wgs84, accuracy: position.coords.accuracy, timestamp: Number.isFinite(position.timestamp) ? position.timestamp : Date.now() };
        renderLocation(); paintUserLocation(true);
        staleTimer = setTimeout(() => { renderLocation(); paintUserLocation(); }, Math.max(0, 300001 - (Date.now() - userPosition.timestamp)));
      }, failure, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    } catch { failure({ code: 2 }); }
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && userPosition) { renderLocation(); paintUserLocation(); } });

  function loadSDK() {
    if (window.AMap?.Map) return Promise.resolve(window.AMap);
    if (loaderPromise) return loaderPromise;
    window._AMapSecurityConfig = { securityJsCode: "56272250f1fdfe56b75f6dfd20001009" };
    loaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timer = setTimeout(() => { script.remove(); reject(new Error("地图连接超时")); }, 18000);
      script.src = "https://webapi.amap.com/maps?v=2.0&key=c15f2a34a14a4c4324ddabca68df7927&plugin=AMap.PlaceSearch,AMap.Scale,AMap.ToolBar";
      script.async = true;
      script.onload = () => { clearTimeout(timer); window.AMap?.Map ? resolve(window.AMap) : reject(new Error("地图服务暂不可用")); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("地图网络连接失败")); };
      document.head.append(script);
    }).catch((error) => { loaderPromise = null; throw error; });
    return loaderPromise;
  }
  function findPlace(AMap, place) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve([]), 10000);
      try {
        const search = new AMap.PlaceSearch({ city: "三亚", citylimit: true, pageSize: 10, extensions: "base" });
        search.search(place.amap, (resultStatus, result) => {
          clearTimeout(timer);
          const results = resultStatus === "complete" ? result?.poiList?.pois || [] : [];
          const options = results.map((poi) => ({ query: place.amap, name: poi.name,
            location: [poi.location?.getLng?.() ?? poi.location?.lng, poi.location?.getLat?.() ?? poi.location?.lat],
            address: [poi.pname, poi.cityname, poi.adname, typeof poi.address === "string" ? poi.address : ""].filter(Boolean).join(""),
            savedAt: Date.now(), poiId: poi.id || "" })).filter((poi) => core.validPOI(poi, place));
          resolve(options.filter((poi, index) => options.findIndex((entry) => entry.name === poi.name && entry.location.join() === poi.location.join()) === index));
        });
      } catch { clearTimeout(timer); resolve([]); }
    });
  }
  function addMarker(place) {
    if (!mapReady || !pois.has(place.id)) return;
    const poi = pois.get(place.id);
    if (markers.has(place.id)) map.remove(markers.get(place.id));
    const marker = new window.AMap.Marker({ position: poi.location, anchor: "bottom-center", content: `<div class="map-marker"><span>${place.index + 1}</span></div>`, title: poi.name });
    marker.on("click", () => selectPlace(place.id)); map.add(marker); markers.set(place.id, marker);
    if (!matches(place)) marker.hide();
  }
  function showMapState(title, detail, busy = false) {
    const overlay = $("#map-loading"); overlay.hidden = false;
    overlay.querySelector("strong").textContent = title; overlay.querySelector("p").textContent = detail;
    overlay.querySelector(".map-loader").hidden = !busy; $("#map-retry").hidden = busy || !navigator.onLine;
  }
  function destroyMap() {
    mapReady = false; map?.destroy(); map = null; infoWindow = null; userMarker = null; accuracyCircle = null; markers.clear();
  }
  async function initializeMap() {
    if (loading || !navigator.onLine) return;
    loading = true;
    const attempt = ++generation;
    showMapState("正在展开三亚地图", "正在连接高德地图", true); status("正在连接高德地图…");
    try {
      const AMap = await loadSDK();
      if (attempt !== generation) return;
      destroyMap();
      map = new AMap.Map("amap", { viewMode: "2D", zoom: 10, center: [109.58, 18.32], resizeEnable: true, scrollWheel: false });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("地图底图加载超时")), 18000);
        map.on("complete", () => { clearTimeout(timer); resolve(); });
      });
      if (attempt !== generation) return;
      map.addControl(new AMap.Scale()); map.addControl(new AMap.ToolBar({ position: "RB" }));
      infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -32) });
      mapReady = true; $("#map-loading").hidden = true;
      places.forEach(addMarker); focusMarkers(); paintUserLocation(); status("地图已展开，正在确认地点…");
      // Limit concurrent requests; multiple search matches require a branch choice.
      let cursor = 0;
      await Promise.all(Array.from({ length: 3 }, async () => {
        while (cursor < places.length && attempt === generation) {
          const place = places[cursor++];
          const options = await findPlace(AMap, place);
          if (attempt !== generation) return;
          if (options.length) candidates.set(place.id, options);
          if (!pois.get(place.id)?.confirmed) {
            const selected = chooseCandidate(place, options);
            if (selected) savePOI(place, { ...selected, confirmed: options.length > 1, savedAt: Date.now() });
          }
          renderPlaces();
        }
      }));
      if (attempt !== generation) return;
      refocusAfterSearch();
    } catch (error) {
      if (attempt !== generation) return;
      destroyMap(); showMapState("地图暂时没有连接上", "行程与收藏仍可查看，也可以直接打开高德。"); status(error.message || "地图暂不可用");
    } finally { if (attempt === generation) loading = false; }
  }
  function networkChanged() {
    if (!navigator.onLine) {
      ++generation; loading = false; destroyMap();
      showMapState("当前处于离线模式", "地图暂不可用，已保存的地点信息仍在。"); status("离线模式 · 地图暂不可用");
    } else initializeMap();
  }
  $("#map-retry").addEventListener("click", initializeMap);
  window.addEventListener("offline", networkChanged); window.addEventListener("online", networkChanged);
  renderPlaces(); networkChanged();
})();
