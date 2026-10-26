# Neon Blocks

一个带落地变形、风险连击和双模式排行榜的浏览器俄罗斯方块游戏。

## 本地运行

直接打开 `index.html`，或在项目目录启动任意静态文件服务器。

## 排行榜

排行榜使用 Supabase 的公开只读表和 `submit_score` 数据库函数。前端配置位于
`config.js`，数据库结构位于 `supabase/schema.sql`。在线服务不可访问时，游戏会
自动使用本机排行榜。
