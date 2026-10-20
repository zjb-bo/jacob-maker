# Jacob的造物网站

正式网站：https://zjb-bo.github.io/jacob-maker/

作品管理：https://zjb-bo.github.io/jacob-maker/admin.html

## 添加作品

1. 打开「作品管理」，填写公开网站链接，选择分类。名称、简介和标签可以选填。
2. 点击「前往 GitHub 确认发布」，使用 **zjb-bo** 登录，在已填好数据的页面点击 **Create** 提交。
3. GitHub Actions 自动读取标题、描述、截取首页，把作品保存到 `projects.json` 并重新发布页面。通常需要 1–3 分钟。
4. 成功后请求会自动关闭，并附上正式网址。失败会在请求下留言，不会用半成品覆盖已上线的网站。

只有仓库主人创建并提交的 `[作品] ` 请求会触发导入。其他访客不能更改作品。前端不保存 GitHub 密钥。

重复网址不会新增。如果网站无法访问或没有可读取的简介，请按失败提示修正请求里的 JSON，然后关闭并重新打开请求重试；仅编辑请求不会启动任务。

作品管理采用 GitHub 作为登录与发布确认界面，不是独立的账号密码系统。所有发布请求和作品数据保存在公开仓库，请只提交公开网站信息。只支持公开 IPv4 HTTP/HTTPS 网站（80/443 端口），网站的反爬、防火墙或登录要求可能导致采集失败。

## 修改或删除已发布作品

在 GitHub 编辑 `projects.json`：修改对应条目，或删除整个条目，提交到 `main` 后自动重建与发布。不要只修改 `index.html` 中生成的作品卡片，否则下次构建会以 JSON 数据覆盖。

## 发布配置

仓库 Settings → Pages → Source 选择 **GitHub Actions**。
`.github/workflows/publish.yml` 在推送、手动运行和主人提交作品请求时执行。
自动任务会直接上传并部署 Pages，不依赖机器人提交再次触发构建。

## 本地维护

- 安装 Node.js 24，执行 `npm ci`。
- `npm test`：测试网址、权限与内容转义。
- `npm run build`：从 `projects.json` 更新首页，并生成 `_site/` 发布目录。
- `python -m http.server 8000`：本地预览。
- `node scripts/check.cjs`：原有桌面/手机布局和作品筛选检查，需要 Chrome 和本地服务器。
- `node scripts/capture.cjs`：刷新原有四张产品截图。

网站展示文件位于根目录及 `assets/`。`admin.html`、`admin.js`、`admin.css` 是管理页面，`scripts/manage.mjs` 是采集、构建和提交逻辑。

采集内容来自作品网站的公开标题与描述，不会自动撰写未经核实的产品功能。网站更新后，已保存的截图不会自动刷新。
