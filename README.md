# Neon Blocks

一个带落地变形、风险连击和双模式排行榜的浏览器俄罗斯方块游戏。

## 本地运行

直接打开 `index.html`，或在项目目录启动任意静态文件服务器。

## 排行榜 API

排行榜后端位于 `api/`，使用 Cloudflare Workers 和 D1：

```bash
cd api
npm install
npx wrangler deploy
npx wrangler d1 execute neon-blocks-leaderboard --remote --file=./schema.sql
```

前端在线地址配置在 `config.js`。在线服务不可访问时，游戏会自动使用本机排行榜。
