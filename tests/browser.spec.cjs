const { test, expect } = require("@playwright/test");
const { createServer } = require("../scripts/serve.cjs");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}/`));
  });
}

async function withServer(overrides, run) {
  const server = createServer(undefined, overrides);
  const url = await listen(server);
  try { await run(url); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

async function mockMap(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => undefined } });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const coordinate = (lng, lat) => ({ lng, lat, getLng: () => lng, getLat: () => lat });
    const fixtures = {
      "三亚海棠湾万丽度假酒店": [
        { name: "三亚海棠湾万丽度假酒店", address: "海棠湾镇椰州路1号", lng: 109.731, lat: 18.373 },
        { name: "三亚海棠湾万丽度假酒店停车场", address: "停车场", lng: 109.732, lat: 18.374 }
      ],
      "三亚亚特兰蒂斯酒店": [
        { name: "三亚亚特兰蒂斯酒店", address: "海棠北路36号", lng: 109.747, lat: 18.386 }
      ],
      "海棠68环球美食街": [
        { name: "海棠68环球美食街", address: "海棠北路68号", lng: 109.742, lat: 18.381 }
      ],
      "三亚 老郎家海鲜大排档 林旺夜市": [
        { name: "老郎家海鲜大排档(林旺夜市店)", address: "林旺夜市", lng: 109.718, lat: 18.343 }
      ],
      "三亚 唠婆香草鸭 海棠68环球美食街": [
        { name: "唠婆香草鸭(海棠湾68美食城店)", address: "海棠湾68美食城二楼", lng: 109.7424, lat: 18.3812 }
      ],
      "三亚 阿俊糟粕醋抱罗粉": [
        { name: "阿俊糟粕醋抱罗粉", address: "海棠湾", lng: 109.724, lat: 18.354 }
      ],
      "三亚 林姐香味海鲜 海棠湾": [
        { name: "林姐香味海鲜(海棠湾店)", address: "海棠湾", lng: 109.721, lat: 18.348 }
      ],
      "三亚 琼小琼糟粕醋火锅 海棠湾": [
        { name: "琼小琼糟粕醋火锅(海棠湾店)", address: "海棠湾", lng: 109.725, lat: 18.352 }
      ],
      "三亚艾迪逊酒店": [
        { name: "三亚艾迪逊酒店", address: "海棠北路100号", lng: 109.754, lat: 18.389 }
      ],
      "三亚 嗲嗲的椰子鸡 三亚湾": [
        { name: "嗲嗲的椰子鸡(三亚湾店)", address: "三亚湾路", lng: 109.503, lat: 18.253 }
      ],
      "三亚 祥姐抱罗粉 第一市场": [
        { name: "祥姐抱罗粉(第一市场店)", address: "第一市场", lng: 109.511, lat: 18.247 }
      ],
      "三亚 馨妈家儋州米烂": [
        { name: "馨妈家儋州米烂", address: "三亚市天涯区", lng: 109.509, lat: 18.251 }
      ],
      "三亚 小公主包鸡烤鸡": [
        { name: "小公主包鸡烤鸡", address: "三亚市天涯区", lng: 109.506, lat: 18.249 }
      ],
      "三亚 晟记普宁肠粉王": [
        { name: "晟记普宁肠粉王", address: "三亚市天涯区", lng: 109.507, lat: 18.248 }
      ],
      "三亚 君陵陵水酸粉": [
        { name: "君陵陵水酸粉", address: "三亚市天涯区", lng: 109.508, lat: 18.25 }
      ],
      "三亚凤凰国际机场": [
        { name: "三亚凤凰国际机场", address: "凤凰路", lng: 109.414, lat: 18.303 }
      ]
    };
    window.AMap = {
      Map: class {
        constructor() { this.actions = []; setTimeout(() => this._complete?.(), 0); window.__tripMap = this; }
        on(name, callback) { if (name === "complete") this._complete = callback; }
        add(value) { this.actions.push(["add", Array.isArray(value) ? value.length : 1]); }
        remove() {}
        addControl() {}
        setFitView(markers) { this.actions.push(["fit", markers.length]); }
        setZoomAndCenter(zoom, position) { this.actions.push(["center", zoom, position]); }
        destroy() { this.actions.push(["destroy"]); }
      },
      Marker: class {
        constructor(options) { Object.assign(this, options); this.visible = true; }
        on() {}
        show() { this.visible = true; }
        hide() { this.visible = false; }
        setPosition(position) { this.position = position; }
        setTitle(title) { this.title = title; }
        setContent(content) { this.content = content; }
      },
      Circle: class {
        constructor(options) { Object.assign(this, options); }
        setCenter(center) { this.center = center; }
        setRadius(radius) { this.radius = radius; }
      },
      InfoWindow: class {
        setContent(content) { this.content = content; }
        open() { this.opened = true; }
        close() { this.opened = false; }
      },
      Pixel: class { constructor(x, y) { this.x = x; this.y = y; } },
      Scale: class {},
      ToolBar: class {},
      PlaceSearch: class {
        search(query, callback) {
          setTimeout(() => callback("complete", { poiList: { pois: (fixtures[query] || []).map((poi) => ({
            name: poi.name, pname: "海南省", cityname: "三亚市", adname: "海棠区", address: poi.address, id: poi.name, location: coordinate(poi.lng, poi.lat)
          })) } }), 1);
        }
      }
    };
  });
}

test("location, nearest place, copy and share work without a backend", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ longitude: 109.7298, latitude: 18.372, accuracy: 35 });
  await mockMap(page);
  await withServer(new Map(), async (url) => {
    await page.goto(url);
    await expect(page.locator("#place-count")).toHaveText("16 / 16 地点");
    await page.getByRole("button", { name: /获取当前位置/ }).click();
    await expect(page.locator("#location-title")).toHaveText("你现在在这里");
    await expect(page.locator("#nearest-place")).toContainText("三亚海棠湾万丽");
    await page.locator("#place-sort").selectOption("distance");
    await expect(page.locator(".place").first()).toContainText("三亚海棠湾万丽");
    await page.locator(".place").first().getByLabel(/复制/).click();
    await expect(page.locator("#toast")).toContainText("地址已复制");
    await page.locator(".place").first().getByLabel(/分享/).click();
    await expect(page.locator("#toast")).toContainText("地点分享内容已复制");
  });
});

test("ambiguous POI candidates stay selectable and confirmed choices survive reload", async ({ page }) => {
  await mockMap(page);
  await withServer(new Map(), async (url) => {
    await page.goto(url);
    const ren = page.locator('#places [data-place-id="ren-sanya-haitang"]');
    await expect(ren).toContainText("更换门店");
    await page.locator('[data-id="ren-sanya-haitang"][data-action="confirm"]').click();
    await expect(page.locator("#trip-dialog")).toBeVisible();
    await page.getByRole("button", { name: /停车场/ }).click();
    await expect(ren).toContainText("停车场");
    await page.reload();
    await expect(page.locator('#places [data-place-id="ren-sanya-haitang"]')).toContainText("更换门店");
    await expect(page.locator('#places [data-place-id="ren-sanya-haitang"]')).toContainText("停车场");
  });
});

test("offline PWA shell keeps trip state available", async ({ page }) => {
    await mockMap(page);
    await withServer(new Map(), async (url) => {
      await page.goto(url);
      await expect(page.locator("[data-event]").first()).toBeAttached();
      await page.locator("[data-event]").first().evaluate((input) => input.click());
      await expect(page.locator(".day-progress").first()).toContainText("1 /");
      await expect.poll(() => page.locator("#cache-status").textContent()).toContain("已保存");
    await page.context().setOffline(true);
    await page.addInitScript(() => Object.defineProperty(navigator, "onLine", { configurable: true, value: false }));
    await page.reload();
    await expect(page.locator("#connection-label")).toHaveText("当前处于离线模式");
    await expect(page.locator("#offline-details")).toBeVisible();
    await expect(page.locator("[data-event]").first()).toBeChecked();
    await expect(page.locator("#map-status")).toContainText("离线模式");
    await page.context().setOffline(false);
  });
});
