# Jacob的造物网站

一个无构建、无框架依赖的个人产品作品集，可直接部署到 GitHub Pages。

## 预览

在本目录运行 `python -m http.server 8000`，打开 http://localhost:8000 。

## 发布到 GitHub Pages

1. 新建 GitHub 仓库（例如 `mypage`），上传 `index.html`、`styles.css`、`script.js`、`assets/` 和 `.nojekyll` 到默认分支根目录。保留 assets 文件夹结构。
2. 在仓库 **Settings → Pages → Build and deployment** 中选择 **Deploy from a branch**。
3. 分支选择 `main`，目录选择 `/ (root)`，保存。
4. 等待部署完成，访问 GitHub Pages 显示的地址，通常为 `https://你的用户名.github.io/mypage/`。

所有资源都使用相对路径，兼容仓库子路径，也兼容 `用户名.github.io` 根域站点。不需要密钥或后端。

## 修改内容

- `index.html`：站点名称、自我介绍、作品链接和简介。
- `styles.css`：配色、布局、手机适配。
- `script.js`：分类筛选。
- `assets/*.jpg`：2026-10-20 截取的真实网站首页截图，随站点一起保存，不依赖外部截图服务。

新增作品时复制一个 `<article class="card">`，更新分类、链接、截图及简介，并更新作品计数和筛选按钮计数。

## 维护截图与检查

仅维护时需要 Node.js：运行 `npm install --no-save --package-lock=false playwright`，电脑需已安装 Chrome。

- `node scripts/capture.cjs`：重新访问四个产品并保存首页截图。
- 启动上述本地服务器后，运行 `node scripts/check.cjs`：检查桌面/手机布局、图片、链接、分类与页面错误，截图保存到 `.qa/`。

产品介绍以采集时的公开首页为依据，不代表对其支付、生成或下载功能完成了端到端验证。
