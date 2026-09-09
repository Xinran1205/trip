# 阿里云 ECS 部署说明

本项目是一个纯静态网站：

- 没有 Node/Vite/React 构建步骤
- 没有后端服务
- 没有数据库、Redis、上传文件等持久化数据
- 入口目录是 `sanya_trip_site/`

所以当前部署不需要 Docker。最简单、稳定、可维护的方案是：

```text
GitHub
  -> 阿里云 ECS
  -> /opt/apps/sanya-trip/repo
  -> Nginx 直接托管 sanya_trip_site/
```

Docker 只有在以后要统一管理多个服务、接入后端、数据库或 CI 镜像流水线时才值得引入。

## 本地配置和预览

进入项目目录：

```powershell
cd D:\trip\sanya_trip_site
```

启动一个本地静态服务器：

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

浏览器访问：

```text
http://127.0.0.1:4173
```

不要直接双击打开 `index.html` 作为最终验证方式。地图 SDK、相对路径和浏览器安全策略在 HTTP/HTTPS 下更接近真实部署环境。

## 提交到 GitHub

本地提交并推送：

```powershell
cd D:\trip
git status
git add README.md DEPLOY_ALIYUN.md sanya_trip_site "阿里云Docker部署-SKILL.md"
git commit -m "Add Sanya trip static site"
git push origin main
```

## 阿里云 ECS 准备

推荐系统：Ubuntu 22.04/24.04、Debian 12、Alibaba Cloud Linux 3 均可。

安全组先放行：

- `22`：SSH
- `80`：HTTP
- `443`：以后配置 HTTPS 时使用

如果你暂时不想占用 80，也可以改用 `8300`，但正式访问建议最终走 80/443。

## 服务器安装 Git 和 Nginx

Ubuntu / Debian：

```bash
sudo apt update
sudo apt install -y git nginx
sudo systemctl enable --now nginx
```

Alibaba Cloud Linux / CentOS：

```bash
sudo yum install -y git nginx
sudo systemctl enable --now nginx
```

确认安装成功：

```bash
git --version
nginx -v
systemctl status nginx --no-pager
```

## 首次拉取项目

创建统一部署目录：

```bash
sudo mkdir -p /opt/apps/sanya-trip
sudo chown -R "$USER":"$USER" /opt/apps/sanya-trip
cd /opt/apps/sanya-trip
```

拉取 GitHub 仓库：

```bash
git clone git@github.com:Xinran1205/trip.git repo
```

如果服务器没有配置 GitHub SSH Key，可以先用 HTTPS：

```bash
git clone https://github.com/Xinran1205/trip.git repo
```

站点根目录应为：

```text
/opt/apps/sanya-trip/repo/sanya_trip_site
```

## 配置 Nginx

创建站点配置：

```bash
sudo tee /etc/nginx/conf.d/sanya-trip.conf >/dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    root /opt/apps/sanya-trip/repo/sanya_trip_site;
    index index.html;

    add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|jpg|jpeg|png|webp|gif|ico|svg)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        try_files $uri =404;
    }
}
EOF
```

检查并重载 Nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

访问：

```text
http://你的服务器公网IP/
```

## 如果 80 端口已经被别的项目占用

改用 `8300`：

```nginx
server {
    listen 8300;
    server_name _;

    root /opt/apps/sanya-trip/repo/sanya_trip_site;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

然后在阿里云安全组放行 `8300`，访问：

```text
http://你的服务器公网IP:8300/
```

## 后续更新

你本地修改后：

```powershell
cd D:\trip
git add .
git commit -m "Update trip site"
git push origin main
```

服务器更新：

```bash
cd /opt/apps/sanya-trip/repo
git pull --ff-only origin main
sudo nginx -t
sudo systemctl reload nginx
```

纯静态文件更新后，通常不需要重启服务器；Nginx 重新读取文件即可。修改 Nginx 配置时才需要 reload。

## 高德地图注意事项

当前高德 JS API 的 Web Key 和 Security Code 写在前端静态代码里，浏览器可以看到。这是静态站点常见接法，但需要在高德控制台配置域名白名单。

部署到阿里云后，请把实际访问域名或公网 IP 加入高德控制台允许范围。否则页面能打开，但地图可能加载失败。

如果以后这是公开生产项目，并且你不希望前端暴露地图配置，可以再加一个后端代理；当前这个旅行页面没有必要为了这一点引入后端。

## 验收命令

服务器本机检查：

```bash
curl -I http://127.0.0.1/
```

如果使用 `8300`：

```bash
curl -I http://127.0.0.1:8300/
```

预期看到 `HTTP/1.1 200 OK`。

检查静态资源：

```bash
curl -I http://127.0.0.1/styles.css
curl -I http://127.0.0.1/app.js
curl -I http://127.0.0.1/assets/coast.jpg
```

浏览器最终检查：

- 首页能打开
- 图片能显示
- 日期切换正常
- 地点列表正常
- 地图能加载或至少显示可重试状态

## 什么时候再考虑 Docker

以后出现这些情况，再加 Docker 更合理：

- 加 Node/Java/Go 后端
- 加 MySQL/PostgreSQL/Redis
- 一台 ECS 上部署很多项目，需要统一 Compose 生命周期
- 希望 GitHub Actions 构建镜像再部署
- 需要更强的环境一致性

当前阶段直接 Nginx 托管静态目录更合适。
