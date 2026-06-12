# Rainy Whisper 网页集合站

这是一个静态 GitHub Pages 首页，用来集中展示我其它仓库里的网页项目，并自动附带站点标题、简介和截图。

## 内容
- 个人网页集合卡片墙
- 自动抓取的标题 / 简介
- 本地生成的站点截图
- 搜索与来源筛选

## 本地生成
先运行抓取脚本，再直接打开 `index.html`：

```bash
node scripts/build_collection_site.mjs
```

## 目录
- `index.html`：集合站首页
- `data/site-data.js`：自动生成的站点数据
- `assets/screenshots/`：自动生成的预览截图
