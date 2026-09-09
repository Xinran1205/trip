# trip

三亚旅行静态站点，主项目在 `sanya_trip_site/`。

部署到阿里云 ECS 时不需要 Docker：这是纯 HTML/CSS/JavaScript 静态项目，没有后端、数据库或构建步骤，直接用 Nginx 托管 `sanya_trip_site` 目录即可。

详细部署步骤见 [DEPLOY_ALIYUN.md](./DEPLOY_ALIYUN.md)。
