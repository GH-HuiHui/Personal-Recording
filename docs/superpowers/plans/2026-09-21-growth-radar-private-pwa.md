# 成长雷达本地隐私 PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有静态 iPhone 原型升级为可安装、离线可用、数据仅存设备本地并支持加密备份的 Framework7 PWA。

**Architecture:** Vite 将 Framework7 与应用模块打包为同源静态资源；业务数据只进入 IndexedDB。UI 通过 repository 接口读写独立 ActionRecord，统计模块保持纯函数，Service Worker 只缓存 App Shell，加密备份只使用 Web Crypto。

**Tech Stack:** Framework7 8、Vite 7、原生 IndexedDB、Web Crypto、Service Worker、Vitest、GitHub Pages Actions。

## Global Constraints

- 不创建账号、后端、云数据库、分析 SDK 或远程业务 API。
- 运行时不得从 CDN、远程字体或第三方脚本加载资源。
- 个人记录不得进入 Git、构建产物、日志、URL、网络请求或 Service Worker 缓存。
- 页面必须兼容 GitHub Pages 仓库子路径与 iPhone safe area。
- 导入失败不得修改现有数据库；加密密码不得持久化。
- 现有截图继续作为视觉真值，不重做产品信息架构。

---

### Task 1: 建立可复现的本地构建与安全基线

**Files:**
- Create: `growth-radar-preview/package.json`
- Create: `growth-radar-preview/vite.config.js`
- Create: `growth-radar-preview/src/main.js`
- Modify: `growth-radar-preview/index.html`
- Create: `growth-radar-preview/tests/security.test.js`

**Interfaces:**
- Produces: `npm run dev`、`npm run build`、`npm test`；入口 `src/main.js`。

- [ ] 添加只包含 Framework7、Vite、Vitest 与 fake-indexeddb 的依赖清单，锁定 lockfile。
- [ ] 写安全测试，断言 HTML 不包含 `http://`、`https://`、分析脚本、远程字体或表单外发地址；首次运行应因现有入口不合规而失败。
- [ ] 将页面入口切换为 Vite 模块，配置相对 base 和构建目录。
- [ ] 添加严格 CSP：默认只允许同源；禁止对象、frame、连接和表单外发；脚本与样式仅允许构建所需范围。
- [ ] 运行 `npm test -- --run` 与 `npm run build`，预期全部通过并生成 `dist/`。
- [ ] 提交：`build: 建立PWA本地构建与安全基线`。

### Task 2: 实现可审计的数据模型与统计

**Files:**
- Create: `growth-radar-preview/src/data/db.js`
- Create: `growth-radar-preview/src/data/seed.js`
- Create: `growth-radar-preview/src/domain/analytics.js`
- Create: `growth-radar-preview/tests/analytics.test.js`
- Create: `growth-radar-preview/tests/db.test.js`

**Interfaces:**
- Produces: `openGrowthRadarDb()`、`seedIfEmpty(db)`、`addRecord(db, dimensionId)`、`deleteRecord(db, recordId)`、`loadSnapshot(db)`、`calculateDimensionStats(snapshot, now)`。

- [ ] 写统计失败测试：同一天三条记录应得到次数 3、活跃日 1；跨日与阶段边界正确。
- [ ] 写数据库失败测试：首次种子仅执行一次；每次记录为独立对象；删除只影响目标记录。
- [ ] 实现三个对象仓库 `stages`、`dimensions`、`records`，所有写入使用事务并返回完成后的结果。
- [ ] 实现六方向零记录种子和纯函数统计，日期按本地自然日归一化。
- [ ] 运行 `npm test -- --run`，预期数据与统计测试全部通过。
- [ ] 提交：`feat: 实现本地记录与自然日统计`。

### Task 3: 重构 Framework7 iOS 主体验

**Files:**
- Create: `growth-radar-preview/src/ui/radar.js`
- Create: `growth-radar-preview/src/ui/today.js`
- Create: `growth-radar-preview/src/ui/history.js`
- Create: `growth-radar-preview/src/ui/settings.js`
- Create: `growth-radar-preview/src/styles/tokens.css`
- Create: `growth-radar-preview/src/styles/app.css`
- Modify: `growth-radar-preview/src/main.js`
- Delete: `growth-radar-preview/app.js`
- Delete: `growth-radar-preview/styles.css`

**Interfaces:**
- Consumes: Task 2 repository 与统计函数。
- Produces: `renderRadar(svg, dimensions, mode)`、`renderToday(container, state, actions)` 与三 Tab 可操作界面。

- [ ] 写 UI DOM 测试，覆盖首次渲染、`+1`、撤销、统计范围切换和 Tab 切换。
- [ ] 初始化 Framework7 iOS 主题，只导入本地构建资源；保留现有标题、分段控件、雷达图、列表与底部 Tab。
- [ ] 将雷达绘制、页面渲染和事件处理拆分到独立模块。
- [ ] 点击 `+1` 时先完成 IndexedDB 事务，再更新界面；失败显示非破坏性错误，不伪造成功。
- [ ] 保留 44 px 以上触控目标、VoiceOver 标签、减少动态效果、safe area 与明暗主题。
- [ ] 运行测试与构建，预期全部通过。
- [ ] 提交：`feat: 重构Framework7 iPhone记录体验`。

### Task 4: 实现加密备份与安全恢复

**Files:**
- Create: `growth-radar-preview/src/data/backup.js`
- Create: `growth-radar-preview/tests/backup.test.js`
- Modify: `growth-radar-preview/src/ui/settings.js`
- Modify: `growth-radar-preview/src/data/db.js`

**Interfaces:**
- Produces: `encryptBackup(snapshot, password)`、`decryptBackup(file, password)`、`replaceDatabase(db, snapshot)`。

- [ ] 写失败测试：正确密码往返一致；错误密码失败；篡改密文失败；无效结构失败；失败导入不覆盖原数据。
- [ ] 使用 PBKDF2-SHA-256、随机 16-byte salt、随机 12-byte IV 和 AES-GCM；备份文件携带固定 schema 版本和 KDF 参数。
- [ ] 导出使用 Blob 下载，不输出密码或明文日志。
- [ ] 导入先在内存完成格式验证与解密，再在单事务内替换三个仓库。
- [ ] 设置页加入密码输入、确认提示、导出、文件选择和恢复结果状态。
- [ ] 运行备份、数据、统计与安全测试，预期全部通过。
- [ ] 提交：`feat: 增加加密备份与事务恢复`。

### Task 5: 实现离线安装与 GitHub Pages 构建

**Files:**
- Create: `growth-radar-preview/public/manifest.webmanifest`
- Create: `growth-radar-preview/public/service-worker.js`
- Create: `growth-radar-preview/public/icons/icon-192.png`
- Create: `growth-radar-preview/public/icons/icon-512.png`
- Create: `growth-radar-preview/public/icons/apple-touch-icon.png`
- Create: `.github/workflows/deploy-growth-radar.yml`
- Create: `growth-radar-preview/tests/pwa.test.js`
- Modify: `growth-radar-preview/index.html`
- Modify: `growth-radar-preview/src/main.js`

**Interfaces:**
- Produces: 可安装 manifest、版本化 App Shell 缓存、相对路径 GitHub Pages 构建产物。

- [ ] 写 PWA 失败测试：manifest 必须 standalone、图标齐全、Service Worker 不缓存数据 URL 且不实现远程 fetch。
- [ ] 生成本地图标并添加 iOS PWA meta、manifest 与主题色。
- [ ] Service Worker 仅缓存构建静态资源；导航离线回退到 App Shell；激活时删除旧版本缓存。
- [ ] 注册 Service Worker，开发环境不注册，注册失败只记录无敏感信息的固定错误码。
- [ ] GitHub Actions 使用官方 Pages actions，从 `growth-radar-preview` 构建并上传 `dist`，不注入 secrets。
- [ ] 运行测试和生产构建，检查产物不存在绝对本地路径、远程 URL 与样例个人记录。
- [ ] 提交：`feat: 支持离线安装与GitHub Pages发布`。

### Task 6: 浏览器验证、视觉 QA 与安全审计

**Files:**
- Modify: `growth-radar-preview/design-qa.md`
- Create: `growth-radar-preview/README.md`

**Interfaces:**
- Consumes: 完整生产应用。
- Produces: 浏览器证据、安装说明、安全边界说明与最终 QA 结论。

- [ ] 启动本地预览，验证 `首页 → 阅读 +1 → 刷新 → 撤销 → 刷新`。
- [ ] 验证断网后 App Shell 和已有记录可打开，控制台无相关错误。
- [ ] 验证加密导出、错误密码失败、正确密码恢复，且浏览器网络日志中无业务请求。
- [ ] 在 393×852 和桌面视口截图；将实现截图与原始参考图合并比较并使用 `view_image` 检查。
- [ ] 修复所有 P0/P1/P2 问题，更新 `design-qa.md` 为 `final result: passed`。
- [ ] README 写明 GitHub Pages 启用方式、iPhone 添加主屏幕步骤、本地数据边界与备份责任。
- [ ] 运行最终 `npm test -- --run`、`npm run build`、`git diff --check`，预期全部通过。
- [ ] 提交：`docs: 完善iPhone安装与安全使用说明`。
