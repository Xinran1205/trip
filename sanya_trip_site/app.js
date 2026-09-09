(() => {
  "use strict";
  const data = window.TRIP_DATA;
  const $ = (selector) => document.querySelector(selector);
  const escapeHTML = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const searchURL = (keyword) =>
    `https://uri.amap.com/search?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent("三亚")}&callnative=1`;
  const captions = [
    "向海出发",
    "海棠湾慢生活",
    "再偷半日闲",
    "走进市井烟火",
    "带着海风回家",
  ];
  const chips = (values) =>
    values
      .map((value) => `<span class="chip">${escapeHTML(value)}</span>`)
      .join("");

  $("#day-tabs").innerHTML = data.days
    .map(
      (day, index) =>
        `<button type="button" class="day-tab${index === 0 ? " active" : ""}" id="day-tab-${index}" role="tab" aria-controls="day-panel-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-day="${index}"><span class="tab-top"><strong>${day.date}</strong><small>${day.weekday}</small></span><span class="tab-caption">${captions[index]}</span></button>`,
    )
    .join("");
  // Event copy is trusted, local editorial HTML from trip-data.js.
  $("#timeline").innerHTML = data.days
    .map(
      (day, index) =>
        `<article class="day-card" id="day-panel-${index}" role="tabpanel" aria-labelledby="day-tab-${index}" tabindex="0" ${index ? "hidden" : ""}><div class="day-top"><div><span class="day-label">DAY ${String(index + 1).padStart(2, "0")} / ${day.date} ${day.weekday}</span><h3>${escapeHTML(day.title)}</h3></div><span class="badge">${escapeHTML(day.mode)}</span></div><div class="events">${day.events.map(([time, copy]) => `<div class="event"><div class="time">${escapeHTML(time)}</div><p>${copy}</p></div>`).join("")}</div></article>`,
    )
    .join("");
  function selectDay(index, focus = false) {
    document.querySelectorAll(".day-tab").forEach((tab, i) => {
      tab.classList.toggle("active", i === index);
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      $(`#day-panel-${i}`).hidden = i !== index;
      if (focus && i === index) tab.focus();
    });
  }
  $("#day-tabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-day]");
    if (tab) selectDay(Number(tab.dataset.day));
  });
  $("#day-tabs").addEventListener("keydown", (event) => {
    const tab = event.target.closest("[data-day]");
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
      return;
    event.preventDefault();
    const index = Number(tab.dataset.day);
    selectDay(
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? data.days.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + data.days.length) %
            data.days.length,
      true,
    );
  });
  $("#hotels").innerHTML = data.hotels
    .map(
      (hotel, index) =>
        `<article class="hotel"><div class="hotel-banner"><strong>${index ? "Sanya Bay" : "Haitang Bay"}<small>${index ? "CITY WALKS & SUNSET" : "OCEAN AIR & SLOW MORNINGS"}</small></strong><span class="night-count">${index ? "01 NIGHT" : "03 NIGHTS"}</span></div><div class="hotel-body"><span class="hotel-date">${hotel.dates} / 2026</span><h3>${escapeHTML(hotel.name)}</h3><p>${escapeHTML(hotel.desc)}</p><div class="meta">${chips(hotel.chips)}</div><button class="hotel-link" data-place-id="${escapeHTML(hotel.mapPlaceId)}">在地图中查看酒店 <span>↗</span></button></div></article>`,
    )
    .join("");
  $("#zones").innerHTML = data.zones
    .map(
      (zone, index) =>
        `<article class="zone"><div class="zone-heading"><span class="zone-icon">0${index + 1}</span><h3>${escapeHTML(zone.name)}</h3></div><p>${escapeHTML(zone.desc)}</p><div class="meta">${chips(zone.chips)}</div></article>`,
    )
    .join("");

  const places = data.places.map((place, index) => ({
    ...place,
    index,
    type:
      place.type ||
      (place.category.startsWith("酒店")
        ? "hotel"
        : place.category === "交通"
          ? "transport"
          : "food"),
    area: place.area || "all",
  }));
  const labels = {
    area: { all: "全部区域", haitang: "海棠湾", sanyaBay: "三亚湾" },
    type: { all: "全部", hotel: "酒店", food: "吃喝", transport: "交通" },
  };
  let activeFilter = "all";
  let activeArea = "all";
  let activePlace = null;
  let map = null;
  let infoWindow = null;
  let resolved = [];
  let loading = false;
  let generation = 0;
  let loaderPromise = null;
  let mapReady = false;
  const status = (text) => {
    $("#map-status").textContent = text;
  };
  const matchesActiveFilters = (place) =>
    (activeFilter === "all" || place.type === activeFilter) &&
    (activeArea === "all" || place.area === activeArea);
  $("#place-count").textContent =
    `${String(places.length).padStart(2, "0")} PLACES`;
  function renderPlaces() {
    const visiblePlaces = places.filter(matchesActiveFilters);
    $("#places").innerHTML = visiblePlaces
      .map(
        (place) =>
          `<article class="place${place.index === activePlace ? " active" : ""}"><button class="place-select" data-place="${place.index}" aria-pressed="${place.index === activePlace}" aria-label="在地图中查看${escapeHTML(place.name)}"><span class="place-number">${String(place.index + 1).padStart(2, "0")}</span><span class="place-copy"><span class="place-category">${escapeHTML(place.category)}</span><strong>${escapeHTML(place.name)}</strong><small>${escapeHTML(place.note)}</small></span></button><div class="place-actions"><a class="external-link" href="${searchURL(place.amap)}" target="_blank" rel="noopener noreferrer">高德打开 ↗</a></div></article>`,
      )
      .join("");
  }
  function syncFilterButtons(selector, dataName, activeValue) {
    document.querySelectorAll(selector).forEach((button) => {
      const active = button.dataset[dataName] === activeValue;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  function visibleResolvedPlaces() {
    return resolved.filter((item) => matchesActiveFilters(item.place));
  }
  function focusVisibleMarkers() {
    if (!mapReady) return;
    infoWindow?.close();
    const visible = visibleResolvedPlaces();
    resolved.forEach((item) =>
      visible.includes(item) ? item.marker.show() : item.marker.hide(),
    );
    if (visible.length)
      map.setFitView(
        visible.map((item) => item.marker),
        false,
        [85, 65, 90, 65],
        14,
      );
    status(
      `已显示 ${visible.length} 个${labels.area[activeArea]} · ${labels.type[activeFilter]}地点`,
    );
  }
  function updateFilter(filter) {
    activeFilter = filter;
    syncFilterButtons(".filter", "filter", filter);
    renderPlaces();
    focusVisibleMarkers();
  }
  function updateArea(area) {
    activeArea = area;
    syncFilterButtons(".area-filter", "area", area);
    renderPlaces();
    focusVisibleMarkers();
  }
  function selectPlaceById(id, scroll = false) {
    const place = places.find((entry) => entry.id === id);
    if (place) selectPlace(place.index, scroll);
  }
  function selectPlace(index, scroll = false) {
    activePlace = index;
    renderPlaces();
    if (scroll || window.matchMedia("(max-width:760px)").matches)
      $("#explore").scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches
          ? "instant"
          : "smooth",
      });
    const item = resolved.find((entry) => entry.place.index === index);
    if (!mapReady || !item) {
      status(
        loading
          ? "正在查询地点，加载完成后会自动定位。"
          : "暂未找到该地点，可通过「高德打开」继续查看。",
      );
      return;
    }
    map.setZoomAndCenter(15, item.location);
    infoWindow.setContent(
      `<div class="map-info"><strong>${escapeHTML(item.place.name)}</strong><span>${escapeHTML(item.address || item.place.note)}</span><br><a target="_blank" rel="noopener noreferrer" href="${searchURL(item.place.amap)}">在高德中查看 / 导航 ↗</a></div>`,
    );
    infoWindow.open(map, item.location);
    status(`正在查看：${item.place.name}`);
  }
  renderPlaces();
  $("#places").addEventListener("click", (event) => {
    const button = event.target.closest("[data-place]");
    if (button) selectPlace(Number(button.dataset.place));
  });
  $(".map-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (button) {
      activePlace = null;
      updateFilter(button.dataset.filter);
    }
  });
  $(".area-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-area]");
    if (button) {
      activePlace = null;
      updateArea(button.dataset.area);
    }
  });
  $("#hotels").addEventListener("click", (event) => {
    const button = event.target.closest("[data-place-id]");
    if (button) {
      updateFilter("all");
      updateArea("all");
      selectPlaceById(button.dataset.placeId, true);
    }
  });
  $("#map-reset").addEventListener("click", () => {
    activePlace = null;
    updateFilter("all");
    updateArea("all");
  });

  function loadSDK() {
    if (window.AMap?.Map) return Promise.resolve(window.AMap);
    if (loaderPromise) return loaderPromise;
    // Static-site integration: configure the security code BEFORE loading JS API 2.0.
    window._AMapSecurityConfig = {
      securityJsCode: "56272250f1fdfe56b75f6dfd20001009",
    };
    loaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error("地图连接超时"));
      }, 18000);
      script.src =
        "https://webapi.amap.com/maps?v=2.0&key=c15f2a34a14a4c4324ddabca68df7927&plugin=AMap.PlaceSearch,AMap.Scale,AMap.ToolBar";
      script.async = true;
      script.onload = () => {
        clearTimeout(timer);
        window.AMap?.Map
          ? resolve(window.AMap)
          : reject(new Error("地图服务暂不可用"));
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(new Error("网络连接失败"));
      };
      document.head.append(script);
    }).catch((error) => {
      loaderPromise = null;
      throw error;
    });
    return loaderPromise;
  }
  function findPlace(AMap, place) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 12000);
      const search = new AMap.PlaceSearch({
        city: "三亚",
        citylimit: true,
        pageSize: 1,
        extensions: "base",
      });
      search.search(place.amap, (resultStatus, result) => {
        clearTimeout(timer);
        const poi =
          resultStatus === "complete" ? result?.poiList?.pois?.[0] : null;
        resolve(
          poi?.location
            ? { place, location: poi.location, address: poi.address }
            : null,
        );
      });
    });
  }
  async function initializeMap() {
    if (loading) return;
    loading = true;
    mapReady = false;
    const attempt = ++generation;
    const overlay = $("#map-loading");
    overlay.hidden = false;
    overlay.querySelector("strong").textContent = "正在展开三亚地图";
    overlay.querySelector("p").textContent = "让海风带路，稍等片刻。";
    overlay.querySelector(".map-loader").hidden = false;
    $("#map-retry").hidden = true;
    $("#map-reset").disabled = true;
    status("正在连接高德地图…");
    try {
      const AMap = await loadSDK();
      map?.destroy();
      resolved = [];
      map = new AMap.Map("amap", {
        viewMode: "2D",
        zoom: 10,
        center: [109.58, 18.32],
        resizeEnable: true,
        scrollWheel: false,
      });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("地图底图加载超时")),
          18000,
        );
        map.on("complete", () => {
          clearTimeout(timer);
          resolve();
        });
      });
      if (attempt !== generation) return;
      map.addControl(new AMap.Scale());
      map.addControl(new AMap.ToolBar({ position: "RB" }));
      infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -32) });
      mapReady = true;
      overlay.hidden = true;
      status("地图已展开，正在查找旅途收藏…");
      const results = await Promise.all(
        places.map((place) => findPlace(AMap, place)),
      );
      if (attempt !== generation) return;
      resolved = results.filter(Boolean).map((item) => {
        const marker = new AMap.Marker({
          position: item.location,
          anchor: "bottom-center",
          content: `<div class="map-marker"><span>${item.place.index + 1}</span></div>`,
          title: item.place.name,
        });
        marker.on("click", () => selectPlace(item.place.index));
        map.add(marker);
        return { ...item, marker };
      });
      $("#map-reset").disabled = false;
      updateFilter(activeFilter);
      if (activePlace !== null) selectPlace(activePlace);
      else if (resolved.length < places.length)
        status(
          `已定位 ${resolved.length}/${places.length} 个地点；未定位地点可通过「高德打开」查看。`,
        );
    } catch (error) {
      mapReady = false;
      map?.destroy();
      map = null;
      overlay.hidden = false;
      overlay.querySelector("strong").textContent = "地图暂时没有连接上";
      overlay.querySelector("p").textContent =
        "请重试，或通过地点卡片在高德中查看。";
      overlay.querySelector(".map-loader").hidden = true;
      $("#map-retry").hidden = false;
      status(error.message || "地图暂时不可用");
    } finally {
      loading = false;
    }
  }
  $("#map-retry").addEventListener("click", initializeMap);
  initializeMap();
})();
