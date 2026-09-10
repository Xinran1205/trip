(() => {
  "use strict";
  const data = window.TRIP_DATA;
  const $ = (selector) => document.querySelector(selector);
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const icon = (name) => `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.TRIP_ICONS[name] || ""}</svg>`;
  document.querySelectorAll("[data-icon]").forEach((node) => { node.outerHTML = icon(node.dataset.icon); });
  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    $("#toast").textContent = message;
    $("#toast").hidden = false;
    toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 4500);
  }
  let storage;
  try {
    storage = window.localStorage;
    storage.setItem("sanya-storage-check", "1");
    storage.removeItem("sanya-storage-check");
  } catch { $("#storage-warning").hidden = false; }
  const read = (key) => window.TripCore.readObject(storage, key);
  function save(key, value) {
    try { storage.setItem(key, JSON.stringify(value)); return true; }
    catch { $("#storage-warning").hidden = false; return false; }
  }
  function dialog(title, html) {
    $("#dialog-title").textContent = title;
    $("#dialog-content").innerHTML = html;
    if (!$("#trip-dialog").open) $("#trip-dialog").showModal();
  }
  $("#dialog-close").addEventListener("click", () => $("#trip-dialog").close());
  async function copy(text, success = "已复制") {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      toast(success);
    } catch {
      dialog("复制内容", `<p>请长按或选中以下内容复制。</p><textarea id="copy-content" readonly aria-label="待复制内容">${escapeHTML(text)}</textarea>`);
      $("#copy-content").focus(); $("#copy-content").select();
    }
  }
  window.TripUI = { $, escapeHTML, icon, toast, read, save, dialog, copy };

  const captions = ["向海出发", "海棠湾慢生活", "再偷半日闲", "走进市井烟火", "带着海风回家"];
  const chips = (values) => values.map((value) => `<span class="chip">${escapeHTML(value)}</span>`).join("");
  const completionKey = "sanya-completed-2026-v1";
  let completed = read(completionKey);
  const eventKey = (day, time) => `2026-${day.date}-${time}`;
  $("#day-tabs").innerHTML = data.days.map((day, index) =>
    `<button type="button" class="day-tab${index === 0 ? " active" : ""}" id="day-tab-${index}" role="tab" aria-controls="day-panel-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-day="${index}"><span class="tab-top"><strong>${day.date}</strong><small>${day.weekday}</small></span><span class="tab-caption">${captions[index]}</span></button>`).join("");
  // Event copy is trusted local editorial HTML. State keys survive copy changes.
  $("#timeline").innerHTML = data.days.map((day, index) =>
    `<article class="day-card" id="day-panel-${index}" role="tabpanel" aria-labelledby="day-tab-${index}" tabindex="0" ${index ? "hidden" : ""}><div class="day-top"><div><span class="day-label">DAY ${String(index + 1).padStart(2, "0")} / ${day.date} ${day.weekday}</span><h3>${escapeHTML(day.title)}</h3></div><span class="badge">${escapeHTML(day.mode)}</span></div><p class="day-progress" data-progress="${index}"></p><div class="events">${day.events.map(([time, content]) => `<div class="event"><div class="time">${escapeHTML(time)}</div><div class="event-content"><p>${content}</p><label class="event-check"><input type="checkbox" data-event="${escapeHTML(eventKey(day, time))}" aria-label="完成 ${escapeHTML(day.date)} ${escapeHTML(time)} 的行程" />已完成</label></div></div>`).join("")}</div></article>`).join("");
  function syncCompleted() {
    document.querySelectorAll("[data-event]").forEach((input) => {
      input.checked = completed[input.dataset.event] === true;
      input.closest(".event").classList.toggle("completed", input.checked);
    });
    data.days.forEach((day, index) => {
      const count = day.events.filter(([time]) => completed[eventKey(day, time)] === true).length;
      $(`[data-progress="${index}"]`).textContent = `${count} / ${day.events.length} 已完成`;
    });
  }
  $("#timeline").addEventListener("change", (event) => {
    const input = event.target.closest("[data-event]");
    if (!input) return;
    completed = { ...completed, [input.dataset.event]: input.checked };
    save(completionKey, completed); syncCompleted();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === completionKey || event.key === null) { completed = read(completionKey); syncCompleted(); }
  });
  syncCompleted();
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
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = Number(tab.dataset.day);
    selectDay(event.key === "Home" ? 0 : event.key === "End" ? data.days.length - 1 :
      (index + (event.key === "ArrowRight" ? 1 : -1) + data.days.length) % data.days.length, true);
  });
  $("#hotels").innerHTML = data.hotels.map((hotel, index) =>
    `<article class="hotel"><div class="hotel-banner"><strong>${index ? "Sanya Bay" : "Haitang Bay"}<small>${index ? "CITY WALKS & SUNSET" : "OCEAN AIR & SLOW MORNINGS"}</small></strong><span class="night-count">${index ? "01 NIGHT" : "03 NIGHTS"}</span></div><div class="hotel-body"><span class="hotel-date">${hotel.dates} / 2026</span><h3>${escapeHTML(hotel.name)}</h3><p>${escapeHTML(hotel.desc)}</p><div class="meta">${chips(hotel.chips)}</div><button type="button" class="hotel-link" data-place-id="${escapeHTML(hotel.mapPlaceId)}">在地图中查看酒店 ${icon("MapPin")}</button></div></article>`).join("");
  $("#zones").innerHTML = data.zones.map((zone, index) =>
    `<article class="zone"><div class="zone-heading"><span class="zone-icon">0${index + 1}</span><h3>${escapeHTML(zone.name)}</h3></div><p>${escapeHTML(zone.desc)}</p><div class="meta">${chips(zone.chips)}</div></article>`).join("");
})();
