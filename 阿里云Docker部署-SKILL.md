---
name: aliyun-docker-deploy
description: >
  用于将本地 Web 项目通过 Docker Compose 部署到一台干净的阿里云 ECS，
  并规范单机多项目隔离、端口规划、环境变量、数据持久化、Nginx、数据库、
  Redis、健康检查、故障排查和后续 CI/CD 演进。
  适用于静态网站、Vite/React/Vue 前端、Spring Boot/Node/Go 后端、
  MySQL/PostgreSQL、Redis、Nginx 等个人或小型全栈项目。
---

# 阿里云单机 Docker 部署 Skill

这是一份面向“本地项目 → GitHub → 阿里云 ECS → Docker Compose”的长期部署规范。

目标不是把一个小项目做得很重，而是保证一台 ECS 在部署第二、第三、甚至第十个项目之后，仍然清晰、可维护、可独立启动和停止。

---

# 1. 最终目标

标准部署拓扑：

```text
本地开发
   |
   v
GitHub 仓库
   |
   v
阿里云 ECS
   |
   v
/opt/apps/<project>
   |
   v
Docker Compose
   |
   +--> frontend / 公网入口
   +--> backend
   +--> database
   +--> redis
```

每个项目必须独立拥有：

- Git 仓库
- 服务器部署目录
- Docker Compose Project
- 端口命名空间
- 生产环境变量
- Volume / 数据目录
- 日志
- 启停生命周期
- 更新生命周期

不同项目不能因为“部署在同一台 ECS”就互相耦合。

---

# 2. 什么时候使用本 Skill

适用于：

- HTML / CSS / JavaScript 静态站点
- Vite / React / Vue
- Spring Boot
- Node.js
- Go
- MySQL
- PostgreSQL
- Redis
- Nginx
- 个人项目
- 小型全栈项目
- 一台 ECS 部署多个独立项目
- 当前手工部署，未来升级 GitHub Actions

不建议直接套用于：

- Kubernetes 集群
- 多节点生产集群
- 大规模分布式系统
- 高可用数据库集群
- 强合规生产系统

---

# 3. 核心原则

## 3.1 一个独立产品 = 一个独立部署生命周期

推荐：

```text
Git Repository
      |
      v
/opt/apps/travel-planner
      |
      v
docker compose -p travel-planner
```

不要这样：

```text
project-a/
├── frontend
├── backend
└── 顺便塞一个 project-b
```

即使最终访问地址是：

```text
/project-a
/project-b
```

如果 Project B 会跟 Project A 一起启动、停止、构建和部署，那它们在部署层面仍然是同一个应用。

必须做到：

```text
Project A 停止
≠
Project B 停止
```

---

## 3.2 前端访问后端统一使用相对路径

推荐：

```text
/api
```

不要在前端业务代码写：

```text
http://1.2.3.4:8201
```

标准生产链路：

```text
Browser
   |
   v
Frontend / Nginx
   |
   +--> 静态资源
   |
   +--> /api --> Backend
```

这样未来从：

```text
localhost
```

切换到：

```text
IP:Port
```

再切换到：

```text
域名
HTTPS
统一反向代理
```

都不需要修改前端业务代码。

---

## 3.3 真实生产 Secret 不进入 Git

仓库中只提交：

```text
.env.example
deploy/aliyun.env.example
```

禁止提交：

```text
.env
deploy/aliyun.env
production.env
数据库密码
JWT Secret
SSH 私钥
API 私钥
```

真实生产配置只保存在服务器或 Secret Manager 中。

---

## 3.4 有状态数据必须持久化

不能依赖容器临时层保存：

- MySQL 数据
- PostgreSQL 数据
- Redis 持久化数据
- 用户上传文件
- 生成文件
- 业务附件

使用：

```text
Docker named volume
```

或：

```text
宿主机目录挂载
```

---

## 3.5 容器 Running 不代表部署成功

部署成功必须至少满足：

- 容器状态正确
- 健康检查正常
- 首页可访问
- 核心 API 正常
- 数据库连接正常
- 日志没有持续 Fatal/Error
- 必要数据已持久化

---

# 4. ECS 多项目标准目录

服务器统一使用：

```text
/opt/apps/
```

例如：

```text
/opt/apps/

├── sanya-trip/
│   ├── repo/
│   ├── data/
│   └── backups/
│
├── travel-planner/
│   ├── repo/
│   ├── data/
│   └── backups/
│
└── emotion-market/
    ├── repo/
    ├── data/
    └── backups/
```

不要长期把项目部署在：

```text
/root/
```

也不要：

```text
/opt/project/
```

里面混放多个无关项目。

---

# 5. 端口命名空间

如果暂时没有域名：

```text
http://SERVER_IP:PORT
```

完全可以作为长期过渡方案。

建议每个项目预留独立端口段。

例如：

```text
81xx -> Project A
82xx -> Travel Planner
83xx -> Sanya Trip
84xx -> Emotion Market
```

一个全栈项目可以约定：

```text
8200  Frontend / Public
8201  Backend
8202  Database
8203  Redis
```

纯静态项目：

```text
8300  Frontend
```

建议长期维护一张端口表：

```text
PROJECT            PUBLIC    BACKEND    DB      REDIS
project-a          8100      8101       8102    8103
travel-planner     8200      8201       8202    8203
sanya-trip         8300      -          -       -
emotion-market     8400      8401       8402    8403
```

端口具体是多少不重要。

重要的是：

```text
有规律
不冲突
一眼能看懂
```

---

# 6. 公网暴露规则

一般只暴露 Frontend / Public Entry。

例如：

```text
Internet
   |
   v
0.0.0.0:8200
   |
   v
Frontend
   |
   v
Backend
   |
   +--> MySQL
   +--> Redis
```

推荐：

```text
Frontend:
0.0.0.0:8200

Backend:
127.0.0.1:8201

MySQL:
127.0.0.1:8202

Redis:
127.0.0.1:8203
```

如果 Backend 只在 Docker 网络内部被 Frontend 使用，甚至不需要映射宿主机端口。

禁止为了调试方便长期开放：

```text
3306
6379
```

到公网。

阿里云安全组只放行业务真正需要的端口。

禁止长期：

```text
1-65535
```

全部开放。

---

# 7. Docker 网络默认方案

## 7.1 新 ECS 默认使用 Docker bridge

对于全新的干净 ECS：

优先使用标准 Compose bridge 网络。

例如：

```text
Frontend
   |
   v
backend:8080
   |
   +--> mysql:3306
   +--> redis:6379
```

容器之间通过 Compose Service Name 通信：

```text
backend
mysql
redis
```

不要依赖容器 IP。

---

## 7.2 不要把旧服务器的 host network 方案当默认方案

历史上曾遇到：

```text
Host is unreachable
No route to host
```

导致：

```text
Frontend
   X
Backend
```

或者：

```text
Backend
   X
MySQL
```

当时通过：

```yaml
network_mode: host
```

绕过 Docker bridge。

这个方案属于：

```text
故障兜底方案
```

不是：

```text
新 ECS 默认方案
```

新服务器必须先：

1. 使用 bridge
2. 验证容器 DNS
3. 验证 service name 互联
4. 确认 bridge 是否稳定

只有 bridge 被证明确实异常，才考虑 host network。

---

# 8. Docker bridge 故障兜底流程

如果出现：

```text
Host is unreachable
No route to host
```

先排查网络。

查看网络：

```bash
docker network ls
docker network inspect <network>
docker compose ps
```

检查容器内 DNS：

```bash
docker compose exec frontend getent hosts backend
docker compose exec backend getent hosts mysql
```

检查访问：

```bash
docker compose exec frontend \
  wget -qO- http://backend:8080/health || true
```

同时排查：

```text
Docker daemon
iptables
nftables
firewalld
Docker DNS
宿主机防火墙
```

只有确定 bridge 路由确实异常，才允许：

```yaml
network_mode: host
```

---

# 9. host network 使用规则

如果必须使用 host network：

所有端口必须重新规划。

例如 Travel Planner：

```text
8200 Frontend
8201 Backend
8202 MySQL
8203 Redis
```

Emotion Market：

```text
8400 Frontend
8401 Backend
8402 MySQL
8403 Redis
```

禁止所有项目都抢：

```text
80
8080
3306
6379
```

因为 host network 下这些就是宿主机真实端口。

---

# 10. Docker Compose Project 隔离

每个项目都显式指定 Compose Project Name。

例如：

```bash
docker compose \
  -p sanya-trip \
  -f docker-compose.aliyun.yml \
  up -d
```

另一个项目：

```bash
docker compose \
  -p travel-planner \
  -f docker-compose.aliyun.yml \
  up -d
```

这样 Docker 自动隔离：

- network
- volume
- container
- label

一般不要滥用：

```yaml
container_name:
```

优先让 Compose 自动命名。

---

# 11. 推荐项目目录结构

全栈项目：

```text
project/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
│
├── backend/
│   ├── Dockerfile
│   └── ...
│
├── deploy/
│   ├── local.env.example
│   └── aliyun.env.example
│
├── docker/
│   └── mysql/
│       └── init/
│
├── data/
│   └── uploads/
│
├── docker-compose.local.yml
├── docker-compose.aliyun.yml
└── README.md
```

纯静态项目：

```text
project/
├── index.html
├── styles.css
├── app.js
├── Dockerfile
├── nginx.conf
├── docker-compose.aliyun.yml
└── README.md
```

---

# 12. 本地与生产配置必须分离

推荐：

```text
docker-compose.local.yml
docker-compose.aliyun.yml
```

本地环境可以为了调试暴露更多端口。

生产环境只暴露必要服务。

Spring Boot 推荐：

```text
application.yml
application-local.yml
application-docker.yml
application-prod.yml
```

职责：

```text
application.yml
公共配置

application-local.yml
本机开发

application-docker.yml
Docker 环境依赖地址

application-prod.yml
生产专属安全/日志配置
```

---

# 13. 环境变量规范

示例：

```env
APP_PORT=
BACKEND_PORT=

MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_ROOT_PASSWORD=

REDIS_HOST=
REDIS_PORT=

JWT_SECRET=

CORS_ALLOWED_ORIGINS=
SERVER_HOST=
```

建议生成强随机 Secret：

```bash
openssl rand -hex 32
```

生产环境不能直接沿用 example 中的弱密码。

---

# 14. 历史坑：MYSQL_USER=root

禁止：

```env
MYSQL_USER=root
```

正确：

```env
MYSQL_ROOT_PASSWORD=<root-password>

MYSQL_USER=<app-user>
MYSQL_PASSWORD=<app-password>
MYSQL_DATABASE=<database>
```

其中：

```text
MYSQL_ROOT_PASSWORD
```

只负责 root。

业务程序正常连接：

```text
普通业务用户
```

而不是 root。

---

# 15. MySQL 初始化 SQL 的坑

例如：

```text
docker/mysql/init/001_schema.sql
```

只会在：

```text
MySQL 数据目录第一次初始化
```

时执行。

如果：

```text
mysql_data volume
```

已经存在：

```text
修改 001_schema.sql
+
docker restart
```

不会更新数据库结构。

后续数据库升级应该使用：

- Flyway
- Liquibase
- migration SQL
- 手工版本化 SQL

禁止为了让 init SQL 重跑，就随便删除生产数据卷。

---

# 16. 数据持久化

MySQL：

```yaml
services:
  mysql:
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

Redis：

```yaml
volumes:
  redis_data:
```

上传目录建议：

```text
/opt/apps/travel-planner/data/uploads
```

映射：

```text
/app/data/uploads
```

不同项目绝对不能共用同一个业务数据目录。

---

# 17. Dockerfile 规范

优先使用多阶段构建。

前端：

```text
Node Builder
   |
   v
dist
   |
   v
Nginx Runtime
```

后端：

```text
Maven / Gradle Builder
   |
   v
JAR
   |
   v
JRE Runtime
```

必须配置：

```text
.dockerignore
```

至少排除：

```text
.git
node_modules
dist
target
logs
*.log
```

尽量固定基础镜像版本。

不要长期依赖：

```text
latest
```

---

# 18. 国内服务器依赖下载问题

阿里云上可能遇到：

```text
Temporary failure in name resolution
Unknown host
Maven timeout
npm timeout
```

优先考虑：

- npm 国内镜像
- Maven 国内镜像
- Docker Build Cache
- 下载重试

如果 Docker daemon DNS 本身异常：

检查：

```text
/etc/docker/daemon.json
```

例如：

```json
{
  "dns": [
    "223.5.5.5",
    "223.6.6.6",
    "119.29.29.29"
  ]
}
```

修改以后：

```bash
systemctl restart docker
```

注意：

```text
重启 Docker
=
可能影响服务器上所有项目
```

多项目服务器上必须先评估影响。

---

# 19. 新阿里云 ECS 首次初始化

## Step 1：检查系统

```bash
uname -a
cat /etc/os-release
```

不要默认所有服务器都是 Ubuntu。

---

## Step 2：安装基础工具

安装：

```text
Git
Docker Engine
Docker Compose Plugin
curl
```

具体安装命令根据：

```text
Ubuntu
Debian
Alibaba Cloud Linux
CentOS
```

分别决定。

---

## Step 3：验证

```bash
git --version
docker --version
docker compose version
curl --version
```

---

## Step 4：创建统一项目目录

```bash
mkdir -p /opt/apps
```

---

## Step 5：配置阿里云安全组

只开放当前项目需要的公网端口。

例如三亚项目：

```text
22
8300
```

---

# 20. 第一次部署标准流程

假设项目：

```text
sanya-trip
```

创建目录：

```bash
mkdir -p /opt/apps/sanya-trip
cd /opt/apps/sanya-trip
```

Clone：

```bash
git clone <repository-url> repo
cd repo
```

如果项目需要环境变量：

```bash
cp deploy/aliyun.env.example deploy/aliyun.env
```

填写真实生产配置。

启动：

```bash
docker compose \
  -p sanya-trip \
  --env-file deploy/aliyun.env \
  -f docker-compose.aliyun.yml \
  up -d --build
```

如果纯静态项目不需要 env：

```bash
docker compose \
  -p sanya-trip \
  -f docker-compose.aliyun.yml \
  up -d --build
```

---

# 21. 后续更新标准流程

服务器代码：

```bash
cd /opt/apps/sanya-trip/repo
```

同步 main：

```bash
git fetch origin
git reset --hard origin/main
```

重新部署：

```bash
docker compose \
  -p sanya-trip \
  -f docker-compose.aliyun.yml \
  up -d --build
```

如果修改：

- Dockerfile
- docker-compose
- Nginx
- Spring Profile
- 环境变量

建议：

```bash
docker compose \
  -p sanya-trip \
  -f docker-compose.aliyun.yml \
  up -d --build --force-recreate
```

不要只：

```bash
docker restart
```

因为 restart 不会应用新的：

```text
image
env
compose
nginx config
```

---

# 22. 部署后必须验证

## 22.1 Compose 状态

```bash
docker compose -p sanya-trip ps
```

---

## 22.2 ECS 本机访问 Frontend

```bash
curl -I http://127.0.0.1:<frontend-port>/
```

---

## 22.3 Backend Health

如果有后端：

```bash
curl http://127.0.0.1:<backend-port>/api/actuator/health
```

理想结果：

```json
{"status":"UP"}
```

---

## 22.4 公网访问

使用另外一台设备：

```text
http://SERVER_IP:<public-port>
```

---

## 22.5 核心业务回归

至少检查：

- 首页
- 静态资源
- 登录
- 核心 API
- 数据库读写
- 上传功能

---

# 23. 历史坑：Health = DOWN

例如：

```json
{"status":"DOWN"}
```

不一定代表 Spring Boot 进程没启动。

可能是：

```text
Spring Boot 已启动
但 MySQL / Redis / 外部依赖不健康
```

如果出现：

```text
500
CannotGetJdbcConnectionException
Communications link failure
```

优先检查：

```text
数据库连接
```

而不是先怀疑 Controller。

---

# 24. 历史坑：Nginx 502

部署刚完成时：

```text
Frontend 已启动
Backend 仍在启动
```

可能短暂出现：

```text
502
Connection reset by peer
```

正常启动过程可能是：

```text
Frontend Ready
     |
Backend Starting
     |
Temporary 502
     |
Backend Healthy
     |
Normal
```

如果只持续几秒，可以属于启动窗口。

如果持续存在，必须继续排查。

查看：

```bash
docker compose -p <project> ps
docker compose -p <project> logs frontend
docker compose -p <project> logs backend
```

重点检查：

- Backend 是否重启循环
- proxy_pass 是否正确
- 后端端口是否正确
- Health 是否 UP
- 数据库是否正常

---

# 25. 历史坑：Nginx read-only warning

如果：

```text
nginx.conf
```

通过：

```text
:ro
```

挂载：

可能看到类似：

```text
can not modify ...
read-only file system
```

如果后续：

- Nginx 正常启动
- 配置生效
- 首页正常

则这条 warning 本身不代表部署失败。

必须根据最终服务状态判断。

---

# 26. 标准日志排查

查看全部：

```bash
docker compose -p sanya-trip logs --tail=100
```

实时：

```bash
docker compose -p sanya-trip logs -f
```

单服务：

```bash
docker compose -p sanya-trip logs backend
```

不要只看：

```text
docker ps
```

---

# 27. 标准排障顺序

永远按层排查。

## Layer 1：公网网络

问题：

```text
浏览器能否访问 SERVER_IP:PORT
```

检查：

- 阿里云安全组
- ECS 防火墙
- 端口监听

---

## Layer 2：宿主机

```bash
ss -lntp
docker ps
docker compose -p <project> ps
```

---

## Layer 3：Frontend

```bash
curl http://127.0.0.1:<frontend-port>/
```

---

## Layer 4：Backend

```bash
curl http://127.0.0.1:<backend-port>/health
```

---

## Layer 5：Docker 内部网络

检查：

```text
service name DNS
container connectivity
network
```

---

## Layer 6：数据库 / Redis

检查：

```text
Host
Port
Username
Password
Database
Permission
Volume
```

---

## Layer 7：业务代码

只有基础设施链路确认正常以后，才重点排查：

```text
Controller
Service
SQL
Frontend Logic
```

不要一上来就改业务代码。

---

# 28. 三亚静态项目首个参考实现

当前三亚项目是纯静态网站。

推荐：

```text
Browser
   |
   v
SERVER_IP:8300
   |
   v
Nginx Container
   |
   v
HTML / CSS / JavaScript
```

不需要：

- Backend
- Database
- Redis

最小 Dockerfile：

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
```

最小 Compose：

```yaml
services:
  frontend:
    build: .
    ports:
      - "8300:80"
    restart: unless-stopped
```

部署：

```bash
docker compose \
  -p sanya-trip \
  -f docker-compose.aliyun.yml \
  up -d --build
```

公网：

```text
http://SERVER_IP:8300
```

---

# 29. 三亚项目升级为 Shared Travel Planner 后

未来架构：

```text
Browser
   |
   v
Frontend :8300
   |
   v
/api
   |
   v
Backend :8301
   |
   +--> Database
   +--> Redis
```

继续使用：

```text
83xx
```

这个端口 namespace。

不要重新塞进其他项目。

---

# 30. 多项目后统一 Gateway

当项目变多时，可以增加一个：

```text
Server Gateway Nginx
```

拓扑：

```text
Internet
   |
   v
Gateway Nginx :80 / :443
   |
   +--> 127.0.0.1:8100 Project A
   +--> 127.0.0.1:8200 Travel Planner
   +--> 127.0.0.1:8300 Sanya
```

Gateway 必须是：

```text
服务器级基础设施
```

不能是：

```text
Project A 内部 Nginx
```

否则又会出现生命周期耦合。

---

# 31. 域名策略

当前没有域名：

```text
SERVER_IP:8100
SERVER_IP:8200
SERVER_IP:8300
```

没问题。

未来有域名以后，多个 SPA 优先：

```text
project-a.example.com
travel.example.com
sanya.example.com
```

而不是：

```text
example.com/project-a
example.com/travel
```

因为 Path Prefix 可能引入：

- Vite base
- React Router basename
- 静态资源路径
- Service Worker
- API Prefix

子域名结构更干净。

---

# 32. 后续 CI/CD 演进路线

第一阶段：

```text
Local
 |
git push
 |
GitHub
 |
服务器 git pull
 |
docker compose up
```

第二阶段：

```text
git push main
      |
      v
GitHub Actions
      |
      v
SSH ECS
      |
      v
deploy.sh
      |
      v
docker compose up
      |
      v
health check
```

第三阶段：

```text
GitHub Actions
      |
      v
Build Docker Image
      |
      v
Container Registry
      |
      v
ECS docker pull
      |
      v
docker compose up
```

项目少的时候不要过早上：

```text
Jenkins
Kubernetes
复杂 DevOps 平台
```

---

# 33. 部署成功验收清单

## 服务器

- [ ] Git 已安装
- [ ] Docker 已安装
- [ ] Docker Compose Plugin 已安装
- [ ] `/opt/apps` 已创建

## 项目隔离

- [ ] 有独立 `/opt/apps/<project>`
- [ ] 有独立 Compose Project Name
- [ ] 有独立端口 namespace
- [ ] 有独立 Volume / Data
- [ ] 可以独立启停

## 安全

- [ ] 真实 env 没有进入 Git
- [ ] MySQL 没有公网暴露
- [ ] Redis 没有公网暴露
- [ ] 安全组只放行必要端口

## 部署

- [ ] 服务器代码是目标 Git Commit
- [ ] Docker Build 成功
- [ ] 容器状态正常
- [ ] Frontend 本机可访问
- [ ] Frontend 公网可访问
- [ ] Backend Health 正常
- [ ] 核心 API 正常
- [ ] 数据库读写正常
- [ ] 日志无持续 Fatal/Error

---

# 34. 新项目标准决策树

```text
这是一个独立产品吗？
  |
  +-- 是
  |
  v
独立 Repo + 独立 Compose Project
  |
  v
是纯静态项目吗？
  |
  +-- 是 --> Nginx + 一个公网端口
  |
  +-- 否 --> Frontend + Backend + DB / Redis
  |
  v
这是全新 ECS 吗？
  |
  +-- 是 --> 默认 Docker bridge
  |
  +-- bridge 已被证明异常 --> 才考虑 host network
  |
  v
哪些服务需要公网访问？
  |
  +-- 默认只有 Public Frontend
  |
  v
数据库 / Redis 要公网吗？
  |
  +-- 默认不要
  |
  v
部署
  |
  v
Health Check
  |
  +-- Healthy --> 完成
  |
  +-- Unhealthy --> 按 Layer 排查
```

---

# 35. AI Agent 使用本 Skill 时必须遵守

当 AI 使用这份 Skill 操作真实项目：

1. 先读取项目结构，再决定 Docker 化方案。
2. 必须判断项目是静态还是全栈。
3. 已有合理配置优先复用，不要为了“规范”随意重写。
4. 不允许无提示覆盖已经稳定运行的生产环境。
5. 不允许随意删除 Docker Volume。
6. 不允许默认把 MySQL / Redis 暴露公网。
7. 新 ECS 默认使用 Docker bridge。
8. host network 只能作为经过验证的故障兜底。
9. 所有独立项目必须有独立部署 namespace。
10. 每次生产变更后必须执行健康检查。
11. Health Check 失败时，不允许声称部署成功。
12. 修改 Docker daemon、宿主机防火墙、Gateway Nginx 等全局配置前，必须考虑对所有项目的影响。
13. 在没有确认数据可删除之前，不允许执行 destructive database volume 操作。
14. 不允许将真实生产 Secret 输出到 Git 仓库文件。
15. 优先给出最简单、可维护的方案，不主动引入 Kubernetes 等重型基础设施。

---

# 36. 最终核心规则

以后默认：

```text
一个产品
一个 Git Repository

一个产品
一个 /opt/apps/<project>

一个产品
一个 Docker Compose Project

一个产品
一个端口 namespace

一个产品
一套生产 env

一个产品
一套 Volume / Data

一个产品
一个独立生命周期
```

不要因为：

```text
“方便”
```

把另一个独立项目塞进当前项目的：

```text
Repository
Dockerfile
Nginx
Docker Compose
```

里面。

短期省几分钟，

长期会变成：

```text
部署耦合
端口混乱
配置混乱
数据混乱
无法单独更新
无法单独停止
```

这份 Skill 的目标就是避免这些问题。
