# 成长雷达 GrowthRadar

一个只把数据留在你 iPhone 上的个人成长记录 PWA。网页外壳公开托管在 GitHub Pages，阶段、方向与行动记录全部保存在设备本地的 IndexedDB 中，不经过账号、服务器或分析服务。

线上地址：[打开成长雷达](https://gh-huihui.github.io/Personal-Recording/)。仓库只保存应用代码、设计文档和测试样例；你的真实记录、导出的 CSV 与加密备份不应提交到仓库。

## 它做什么

- 三 Tab 结构：今天 / 历史 / 设置。
- 每次 `+1` 保存为一条独立的 ActionRecord，而不是累加一个数字。
- 由记录实时聚合今日次数、近 7 日次数、活跃天数与本阶段活跃率，并以雷达图呈现。
- 支持撤销最近一次记录。
- 可安装到主屏幕，离线打开、离线记录。
- 支持导出 AES-GCM 加密的备份文件并导入恢复。

## 隐私边界

这是本项目的核心约束，不是可选项：

- 没有账号、云同步、多人共享或服务端数据库。
- 运行时不从 CDN、远程字体或第三方脚本加载任何资源；CSP 限制为同源，`connect-src 'none'`。
- 个人记录不进入 Git、构建产物、日志、URL、网络请求或 Service Worker 缓存。
- Service Worker 只缓存同源静态 GET 资源，不截获也不上传业务数据。
- 网页外壳和前端代码是公开的；你的记录不是。其他人打开同一网址只会得到一份独立的空白本地数据。

### 谁负责备份

**你。** Safari 会在清理网站数据时删除 IndexedDB，iOS 也可能在长期不使用后回收存储。这项工作没有云端副本可以回退，加密备份文件是唯一的保护手段。

建议在每个阶段的收尾节点、以及换机或重装之前，到「设置 → 加密备份」导出一次，并把文件放到可信位置（例如电脑上的加密磁盘或密码管理器附件）。

导入时请留意：

- 密码不会被保存或上传；**忘记密码将无法恢复备份**，没有找回途径。
- 导入会覆盖本机现有记录，界面会先要求确认。
- 密码错误或文件损坏时，导入会失败并保留现有数据不变。

## 在 iPhone 上安装

1. 推荐用 **Safari** 打开部署后的 HTTPS 网址。
2. 点击底部工具栏的「分享」按钮。
3. 在弹出菜单中向下滚动，选择「添加到主屏幕」。
4. 确认名称为「成长雷达」后点击「添加」。

首次联网打开后，等待静态资源缓存完成，再从主屏幕打开并测试飞行模式下能否重开、记录。真实 iPhone 安装和文件保存仍需在你的设备上验收。

## 启用 GitHub Pages

仓库已包含 `.github/workflows/deploy-growth-radar.yml`：向 `master` 推送 `growth-radar-preview/**` 的改动，或手动触发 workflow，都会运行测试、构建并发布 `dist/`。

首次启用：

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment** 下把 **Source** 设为 **GitHub Actions**。
3. 推送一次改动或到 **Actions** 页面手动运行「发布成长雷达到 GitHub Pages」。
4. 等待运行完成后，Pages 会给出访问地址，形如 `https://<用户名>.github.io/<仓库名>/`。

构建使用相对 `base`，因此仓库子路径下资源、图标与 Service Worker 均按相对路径解析，无需为子路径改配置。Workflow 只构建和发布静态资源，不注入任何 secret，也读不到你的业务数据。

## 本地开发

```bash
cd growth-radar-preview
npm ci            # 安装锁定依赖
npm run dev       # 本地开发预览
npm test -- --run # 运行测试
npm run build     # 生产构建，输出 dist/
npm run preview   # 预览生产构建
```

Service Worker 在开发环境不注册，只在生产构建中生效。

### Service Worker 版本控制

`dist/service-worker.js` 不是仓库里的静态文件，而是构建时由 `src/service-worker.template.js` 生成的：

- `vite.config.js` 中的插件收集本次构建的全部静态产物，按内容计算 SHA-256 前 12 位作为缓存版本号；
- 生成时替换模板中的 `__CACHE_VERSION__` 与 `__PRECACHE_ASSETS__`；
- 新版等待旧页面关闭后激活，只删除属于当前部署路径的旧缓存，不影响其他项目；
- 更新失败时浏览器会继续使用当前缓存版本，下次启动重试。

## 技术栈

## 安全限制（不能承诺绝对防入侵）

- IndexedDB 本地记录不是应用层加密；只有导出的备份加密。解锁设备、恶意浏览器扩展或被篡改的同源代码仍可能读取记录。
- GitHub 私有仓库不等于私有 Pages 网站；普通 Pages 发布的是公开静态外壳。需要访问控制的网站不属于当前方案。
- 同一个 GitHub Pages 域名下不同仓库共享源，应使用独立可信域名或不承载其他不可信页面的专用 Pages 账号。不要在此应用保存密码、证件或其他高敏感数据。
- 静态应用没有业务后端或关键 API，不能凭空提供服务端鉴权；CSP 是纵深防护，不是抵御发布账户被接管的保证。
- GitHub 托管方仍可看到静态资源请求的 IP 等访问元数据。请保护发布账户，启用通行密钥或双因素认证，审查部署改动。
- GitHub Pages 已上线；线上可访问不等于真实 iPhone 验收或专业安全审计。

Framework7 9（iOS 主题）· Vite 7 · 原生 IndexedDB · Web Crypto（PBKDF2-SHA-256 + AES-GCM 256）· Service Worker · Vitest。

加密备份参数：PBKDF2 迭代 600,000 次，16 字节随机 salt，12 字节随机 IV，每次导出重新生成。备份文件只包含版本、KDF 参数、salt、IV 与密文。

## 目录结构

```text
growth-radar-preview/
├── index.html
├── vite.config.js
├── styles.css
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── main.js
│   ├── service-worker.template.js
│   ├── data/        # db.js · seed.js · backup.js
│   ├── domain/      # analytics.js（纯函数，不依赖 DOM）
│   └── ui/          # radar.js · today.js · history.js · settings.js
├── assets/icons/
└── tests/
```

`data` 只负责持久化、种子数据与备份；`domain` 只负责按本机时区自然日归一化的统计；`ui` 只负责渲染与交互。
