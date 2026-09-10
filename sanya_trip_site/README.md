# 三亚 · 度假手记

无框架、无后端的静态网站，保留 2026 年 10 月 3–7 日三亚行程。根目录的 Node 脚本只用于本地测试、图标生成和离线缓存版本号生成。

## 本地预览

在仓库根目录运行：

```powershell
npm install
npm run prepare:assets
npm run preview
```

浏览器访问 http://127.0.0.1:4173 。地图需要联网；当前位置、PWA 安装和离线缓存上线后需要 HTTPS。

## 文件

- `index.html`：页面结构、导航与地图容器。
- `styles.css`：沙白与深海绿主题，桌面、平板及手机布局，减少动态效果支持。
- `trip-data.js`：行程、酒店、区域和地点数据；行程文案允许本地可信 HTML。
- `app.js`：日期页签、键盘导航、行程完成状态和共享 UI。
- `travel-map.js`：高德地图、地点筛选、当前位置、距离计算、导航、复制和分享。
- `trip-core.js`：坐标校验、Haversine 距离、缓存校验和高德 URI 生成。
- `manifest.json` / `service-worker.js` / `pwa.js`：添加到主屏幕、离线缓存和更新提示。
- `vendor/`：本地打包的图标与坐标转换库。
- `assets/coast.jpg`：随站点提供的海岸氛围照片，不代表酒店或特定三亚地点实拍。来源：https://images.unsplash.com/photo-1507525428034-b723cf961d3e
- `assets/icons/`：PWA 图标，由根目录脚本生成。

## 地图

使用高德 JS API 2.0，在 SDK 加载前设置用户提供的 Security Code。地点通过 `AMap.PlaceSearch` 在三亚实时检索，使用返回的高德坐标建立标记；多个候选门店会保留“更换门店”选择。支持分类筛选、收藏筛选、距离排序、点击定位、信息窗、全部视野、缩放与比例尺。

当前位置使用浏览器 `navigator.geolocation`，不会上传到服务器，也不会写入本地存储。距离为本地 Haversine 直线距离：浏览器定位是 WGS84，高德 POI 是 GCJ02，页面会先做坐标转换再计算。

当前按纯静态方式接入，浏览器能看到 Web Key 和 Security Code。若高德控制台启用了域名白名单，部署时需要包含实际域名；不在本项目中配置或修改账号权限。正式公网项目可按官方文档升级为服务端安全代理：https://developer.amap.com/api/javascript-api-v2/guide/abc/jscode

原有 noindex 设置保留，但它并非访问控制。无需登录。

## 离线

PWA 会缓存 HTML、CSS、JS、图片、图标、manifest 和行程数据。离线时行程、酒店、收藏地点和已完成状态仍可看；高德地图、POI 搜索和高德导航需要网络。
