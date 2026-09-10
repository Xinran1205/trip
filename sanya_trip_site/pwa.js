(() => {
  "use strict";
  const { $, dialog, toast } = window.TripUI;
  let registration = null, promptEvent = null, ready = false, registering = false;
  let cacheMessage = "正在保存离线副本", updateTimer;
  let hadController = Boolean(navigator.serviceWorker?.controller);
  const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  function render() {
    const offline = !navigator.onLine;
    $("#connection-label").textContent = offline ? "当前处于离线模式" : "旅程随身带";
    $("#connection-dot").classList.toggle("offline", offline);
    $("#offline-details").hidden = !offline;
    $("#cache-status").textContent = ready ? (offline ? "离线副本可用" : "已保存，可离线打开") :
      offline ? "本页内容可查看；尚未确认离线副本" : cacheMessage;
    $("#pwa-install").hidden = standalone();
    $("#pwa-update").hidden = !registration?.waiting;
    $("#pwa-update").disabled = offline;
  }
  async function checkOffline() {
    const worker = navigator.serviceWorker?.controller || registration?.active;
    if (!worker) return;
    const result = await new Promise((resolve) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 5000);
      channel.port1.onmessage = (event) => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
      try { worker.postMessage({ type: "CHECK_OFFLINE" }, [channel.port2]); }
      catch { clearTimeout(timer); channel.port1.close(); resolve(null); }
    });
    ready = result?.ready === true;
    if (!ready) cacheMessage = "离线副本尚未就绪";
    $("#pwa-retry").hidden = ready || !navigator.onLine;
    render();
  }
  function watchWorker(worker) {
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed") render();
      if (worker.state === "activated") checkOffline();
      if (worker.state === "redundant") {
        cacheMessage = "离线副本保存失败，可联网后重试";
        $("#pwa-retry").hidden = false; render();
      }
    });
  }
  async function register() {
    if (registering) return;
    if (!window.isSecureContext || !("serviceWorker" in navigator)) {
      cacheMessage = !window.isSecureContext ? "离线保存需要 HTTPS 连接" : "此浏览器不支持离线保存";
      render(); return;
    }
    registering = true; $("#pwa-retry").hidden = true;
    try {
      registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./", updateViaCache: "none" });
      registration.addEventListener("updatefound", () => watchWorker(registration.installing));
      watchWorker(registration.installing);
      if (registration.active) await checkOffline();
      render();
    } catch {
      cacheMessage = "离线副本保存失败，可联网后重试";
      $("#pwa-retry").hidden = false; render();
    } finally { registering = false; }
  }
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (hadController) { clearTimeout(updateTimer); window.location.reload(); return; }
    hadController = true; checkOffline();
  });
  $("#pwa-update").addEventListener("click", () => {
    if (!registration?.waiting) return;
    $("#pwa-update").disabled = true;
    registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
    updateTimer = setTimeout(() => { $("#pwa-update").disabled = false; toast("更新尚未完成，请稍后重试。"); }, 15000);
  });
  $("#pwa-retry").addEventListener("click", async () => {
    if (!navigator.onLine) return;
    if (!window.isSecureContext || !("serviceWorker" in navigator)) { render(); return; }
    try {
      registration = await navigator.serviceWorker.register(`./service-worker.js?retry=${Date.now()}`, { scope: "./", updateViaCache: "none" });
      registration.addEventListener("updatefound", () => watchWorker(registration.installing));
      watchWorker(registration.installing);
      await checkOffline();
      render();
    } catch { toast("仍无法保存离线副本，请检查网络后重试。"); }
  });
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); promptEvent = event; render(); });
  window.addEventListener("appinstalled", () => { promptEvent = null; $("#pwa-install").hidden = true; toast("已添加三亚手记"); });
  $("#pwa-install").addEventListener("click", async () => {
    if (!window.isSecureContext) { dialog("添加到主屏幕", "<p>请先通过 HTTPS 地址打开旅程，再添加到主屏幕。</p>"); return; }
    if (promptEvent) {
      const prompt = promptEvent; promptEvent = null;
      try { await prompt.prompt(); await prompt.userChoice; }
      catch { toast("请使用浏览器菜单添加到主屏幕。"); }
      return;
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    dialog("添加到主屏幕", ios ? "<p>在 Safari 中打开此页面，点按分享按钮，选择「添加到主屏幕」，再点按「添加」。</p>" :
      "<p>打开浏览器菜单，选择「安装应用」或「添加到主屏幕」。如果没有该选项，请使用支持安装的 Chrome、Edge 或手机系统浏览器。</p>");
  });
  window.addEventListener("offline", render);
  window.addEventListener("online", () => {
    render();
    if (registration) { registration.update().catch(() => {}); checkOffline(); } else register();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { render(); if (registration) checkOffline(); }
  });
  render(); register();
})();
