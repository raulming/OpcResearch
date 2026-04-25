# OPC AI 公益课扫码自测

一个零依赖 Node 小应用，包含两个学员自测页面和一个后台管理页面。

## 本地运行

```bash
node webapp/server.js
```

打开：

- 学员入口：http://localhost:3100/
- 后台入口：http://localhost:3100/admin.html?token=opc2026

## 部署

设置环境变量后启动：

```bash
PORT=3100 ADMIN_TOKEN=你的后台口令 node webapp/server.js
```

提交数据会写入 `webapp/data/responses.json`。
