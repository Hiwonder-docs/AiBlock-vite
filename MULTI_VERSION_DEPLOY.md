# 多版本文档部署流程（ROSOrin-vite）

> 适用于同一个 GitHub 仓库支持多个文档版本（Jetson Orin Nano 版本、Jetson Nano 版本、Raspberry Pi 版本）的场景。
> 每个版本独立构建，共享同一个 `main` 分支，通过宝塔 Nginx 反向代理统一对外提供服务。
> **注意**：Jetson Orin Nano 版本的首个文档为 `1_ROSOrin_Pro_User_Manual.md`，与其他两个版本（`1_ROSOrin_User_Manual.md`）不同。

---

## 架构说明

```
GitHub 仓库：ROSOrin-vite（单一仓库）
    │
    ├── content/                         ← 三个版本的源文件
    │   ├── jetson-orin-nano-version/
    │   │   ├── docs/                    ← Jetson Orin Nano 版本的 Markdown
    │   │   │   └── 1_ROSOrin_Pro_User_Manual.md   ← 该版本特有（Pro 版本文档）
    │   │   └── _static/                 ← Jetson Orin Nano 版本的静态资源
    │   ├── jetson-nano-version/
    │   │   ├── docs/                    ← Jetson Nano 版本的 Markdown
    │   │   │   └── 1_ROSOrin_User_Manual.md       ← 标准版本首个文档
    │   │   └── _static/                 ← Jetson Nano 版本的静态资源
    │   └── raspberry-pi-version/
    │       ├── docs/                    ← Raspberry Pi 版本的 Markdown
    │       │   └── 1_ROSOrin_User_Manual.md       ← 标准版本首个文档
    │       └── _static/                 ← Raspberry Pi 版本的静态资源
    │
    ├── projects/                        ← 构建产物（同时包含三个版本）
    │   └── ROSOrin/
    │       └── en/
    │           ├── jetson-orin-nano-version/  ← Jetson Orin Nano 构建结果
    │           │   ├── assets/
    │           │   ├── docs/
    │           │   └── index.html
    │           ├── jetson-nano-version/        ← Jetson Nano 构建结果
    │           │   ├── assets/
    │           │   ├── docs/
    │           │   └── index.html
    │           └── raspberry-pi-version/       ← Raspberry Pi 构建结果
    │               ├── assets/
    │               ├── docs/
    │               └── index.html
    │
    ├── index.html                       ← 仓库根目录版本选择页（三卡片）
    │
    ├── docs/                             ← VitePress 工作目录（构建时临时拷贝内容）
    │   ├── index.md                      ← 重定向页入口，构建时会被各版本 index.md 覆盖
    │   └── .vitepress/
    │       ├── config.mts                ← 构建时通过环境变量 DOCS_BASE / DOCS_VERSION 动态配置
    │       └── theme/
    │           └── Layout.vue            ← 包含三版本版本切换器（Jetson Orin Nano / Jetson Nano / Raspberry Pi）
    │
    └── scripts/
        ├── build_version.mjs             ← 单版本构建脚本（参数：版本号）
        └── stage_main_site.mjs           ← 将构建产物 stage 到 projects 目录

访问地址：
- Jetson Orin Nano：  https://wiki.hiwonder.com/projects/ROSOrin/en/jetson-orin-nano-version/
- Jetson Nano：       https://wiki.hiwonder.com/projects/ROSOrin/en/jetson-nano-version/
- Raspberry Pi：      https://wiki.hiwonder.com/projects/ROSOrin/en/raspberry-pi-version/
```

---

## 占位符说明

| 占位符 | 含义 | 本项目实际值 |
|--------|------|--------------|
| `<REPO_NAME>` | GitHub 仓库名 | `ROSOrin-vite` |
| `<PROJECT_NAME>` | 产品项目名（部署路径二级目录） | `ROSOrin` |
| `<VERSION_A>` | 第一个版本（Jetson Orin Nano） | `jetson-orin-nano-version` |
| `<VERSION_B>` | 第二个版本（Jetson Nano） | `jetson-nano-version` |
| `<VERSION_C>` | 第三个版本（Raspberry Pi） | `raspberry-pi-version` |
| `<DOCS_BASE_A>` | 第一个版本 base path | `/projects/ROSOrin/en/jetson-orin-nano-version/` |
| `<DOCS_BASE_B>` | 第二个版本 base path | `/projects/ROSOrin/en/jetson-nano-version/` |
| `<DOCS_BASE_C>` | 第三个版本 base path | `/projects/ROSOrin/en/raspberry-pi-version/` |
| `<BAOTA_SITE_DIR>` | 宝塔面板站点根目录 | `/www/wwwroot/wiki/` |
| `<PROJECTS_REMOTE_DIR>` | 同步到服务器后的 projects 目标路径 | `/www/wwwroot/wiki/projects/` |

---

## 版本目录约束

每个版本的源内容必须放置在 `content/<VERSION>/` 目录下，且包含：

```
content/<VERSION>/
├── docs/        ← 该版本所有 Markdown 文档（可多级目录）
│   └── index.md ← 入口文件，必须使用 layout: page-redirect + redirectTo
└── _static/     ← 该版本所有图片、附件、资源文件
```

### 各版本 index.md 重定向规则（⚠️ 重要）

**1. `content/jetson-orin-nano-version/docs/index.md`（Pro 版本，跳转 Pro 用户手册）**

```markdown
---
layout: page-redirect
redirectTo: /docs/1_ROSOrin_Pro_User_Manual.html
---

正在跳转到内容页面...
```

**2. `content/jetson-nano-version/docs/index.md`（标准版本）**

```markdown
---
layout: page-redirect
redirectTo: /docs/1_ROSOrin_User_Manual.html
---

正在跳转到内容页面...
```

**3. `content/raspberry-pi-version/docs/index.md`（标准版本）**

```markdown
---
layout: page-redirect
redirectTo: /docs/1_ROSOrin_User_Manual.html
---

正在跳转到内容页面...
```

> 构建流程会自动把对应版本的 `docs/index.md` 内容覆盖到工作目录 `docs/index.md`，构建完成后自动还原。

---

## 一、环境准备

### 1. 依赖安装

在仓库根目录执行：

```bash
npm install
```

> VitePress 对 Node 版本要求：`Node.js 20.19+` 或 `22.12+`，建议使用 `nvm`/`nvm-windows` 管理。
> 如果用 Docker 构建，基础镜像必须用 `node:20.19-alpine` 或更高的明确版本。

### 2. 目录初始化检查

确保存在以下目录（不存在请手动创建）：

```
mkdir -p content/jetson-orin-nano-version/docs content/jetson-orin-nano-version/_static
mkdir -p content/jetson-nano-version/docs content/jetson-nano-version/_static
mkdir -p content/raspberry-pi-version/docs content/raspberry-pi-version/_static
mkdir -p projects/ROSOrin/en
```

---

## 二、package.json 脚本说明

[package.json](file:///e:/phpstudy_pro/WWW/githup/Jetson%20Series/ROSOrin-vite/package.json) 中定义：

```json
{
  "scripts": {
    "build": "npm run build:jetson-orin-nano",
    "dev": "vitepress dev docs",
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs",
    "docs:stage-main": "node scripts/stage_main_site.mjs",
    "build:jetson-orin-nano": "node scripts/build_version.mjs jetson-orin-nano-version",
    "build:jetson-nano":     "node scripts/build_version.mjs jetson-nano-version",
    "build:raspberry-pi":    "node scripts/build_version.mjs raspberry-pi-version",
    "build:all": "npm run build:jetson-orin-nano && npm run build:jetson-nano && npm run build:raspberry-pi"
  }
}
```

### 常用命令速查

| 命令 | 作用 |
|------|------|
| `npm run docs:dev` | 本地预览工作目录 `docs/`（开发时用，先手动拷贝内容） |
| `npm run build:jetson-orin-nano` | 单独构建 Jetson Orin Nano 版本（推荐单独调试） |
| `npm run build:jetson-nano` | 单独构建 Jetson Nano 版本 |
| `npm run build:raspberry-pi` | 单独构建 Raspberry Pi 版本 |
| `npm run build:all` | 顺序构建全部三个版本（最终发布时使用） |
| `npm run docs:preview` | 预览构建后的 VitePress 产物 |

---

## 三、构建脚本核心逻辑

### 1. `scripts/build_version.mjs` 流程

输入参数：`<VERSION>`（`jetson-orin-nano-version` / `jetson-nano-version` / `raspberry-pi-version`）

构建步骤（每版本独立执行）：

1. **参数校验**：版本号必须属于 `['jetson-orin-nano-version', 'jetson-nano-version', 'raspberry-pi-version']`，否则退出。
2. **准备入口**：读取 `content/<VERSION>/docs/index.md`，覆盖写入工作目录 `docs/index.md`（用于首页重定向）；构建结束 finally 块内自动还原为原内容。
3. **拷贝内容**（Step 1/3）：
   - 删除 `docs/docs/` 和 `docs/_static/`（清理上一版本残留）
   - `cp content/<VERSION>/docs    -> docs/docs`
   - `cp content/<VERSION>/_static -> docs/_static`
4. **VitePress 构建**（Step 2/3）：注入环境变量执行 `npx vitepress build docs`
   - `DOCS_BASE=/projects/ROSOrin/en/<VERSION>/`
   - `DOCS_VERSION=<VERSION>`
5. **Stage 产物**（Step 3/3）：调用 `stage_main_site.mjs` 把 `docs/.vitepress/dist/` 整个拷贝到：
   - `projects/ROSOrin/en/<VERSION>/`

> 关键：因为步骤 3 会覆盖 `docs/docs` 与 `docs/_static`，所以 **`build:all` 必须串行执行**，不能并行（避免不同版本内容互相覆盖）。

### 2. `docs/.vitepress/config.mts` 动态配置

从环境变量读取：

```ts
const docsBase = normalizeBase(process.env.DOCS_BASE || '/projects/ROSOrin/en/jetson-orin-nano-version/')
const currentVersion = process.env.DOCS_VERSION || 'jetson-orin-nano-version'
```

用于：
- VitePress 的 `base`（资源前缀、导航链接生成）
- 页面 `<head>` 中 favicon 路径
- 顶部导航 `Version` 下拉菜单的版本链接

### 3. `docs/.vitepress/theme/Layout.vue` 版本切换器

运行时注入切换器到导航栏：

```ts
const ALL_VERSIONS = ['jetson-orin-nano-version', 'jetson-nano-version', 'raspberry-pi-version']
const VERSION_LABELS: Record<string, string> = {
  'jetson-orin-nano-version': 'Jetson Orin Nano',
  'jetson-nano-version':      'Jetson Nano',
  'raspberry-pi-version':     'Raspberry Pi'
}
```

切换版本时，会把当前 URL 中的 `/en/<CURRENT_VERSION>/xxx` 替换为 `/en/<TARGET_VERSION>/`，跳转到目标版本根页面。

### 4. `index.html` 根目录版本选择页

仓库根目录 `index.html` 提供三个卡片入口（用于直接访问仓库根路径时版本选择）：

```
Jetson Orin Nano Version  →  /projects/ROSOrin/en/jetson-orin-nano-version/
Jetson Nano Version       →  /projects/ROSOrin/en/jetson-nano-version/
Raspberry Pi Version      →  /projects/ROSOrin/en/raspberry-pi-version/
```

---

## 四、本地构建与验证

### Step 1：先单独构建 Jetson Orin Nano 版本（推荐单独验证，因为首个 md 不同）

```bash
npm run build:jetson-orin-nano
```

预期输出结尾：

```
========== jetson-orin-nano-version build complete ==========

Staged files to: <REPO>/projects/ROSOrin/en/jetson-orin-nano-version
```

### Step 2：单独构建 Jetson Nano 版本

```bash
npm run build:jetson-nano
```

### Step 3：单独构建 Raspberry Pi 版本

```bash
npm run build:raspberry-pi
```

### Step 4：一次性构建全部三个版本

```bash
npm run build:all
```

### Step 5：本地验证产物目录结构

```
projects/ROSOrin/en/
├── jetson-orin-nano-version/
│   ├── index.html
│   ├── assets/
│   └── docs/
│       ├── 1_ROSOrin_Pro_User_Manual.html   ← ✅ 必须存在（Pro 版本）
│       └── ...
├── jetson-nano-version/
│   ├── index.html
│   ├── assets/
│   └── docs/
│       ├── 1_ROSOrin_User_Manual.html       ← ✅ 必须存在（标准版本）
│       └── ...
└── raspberry-pi-version/
    ├── index.html
    ├── assets/
    └── docs/
        ├── 1_ROSOrin_User_Manual.html       ← ✅ 必须存在（标准版本）
        └── ...
```

### Step 6：重定向验证（文件级）

分别打开三个版本的 `index.html`，确认其内部包含正确的跳转逻辑：

- `projects/ROSOrin/en/jetson-orin-nano-version/index.html`
  - 页面脚本最终应跳转到 `/docs/1_ROSOrin_Pro_User_Manual.html`
- `projects/ROSOrin/en/jetson-nano-version/index.html`
  - 页面脚本最终应跳转到 `/docs/1_ROSOrin_User_Manual.html`
- `projects/ROSOrin/en/raspberry-pi-version/index.html`
  - 页面脚本最终应跳转到 `/docs/1_ROSOrin_User_Manual.html`

---

## 五、Git 提交策略

### 推荐忽略规则

`.gitignore` 建议加入：

```
# VitePress 临时工作目录
docs/docs/
docs/_static/
docs/.vitepress/dist/
docs/.vitepress/cache/

# Node
node_modules/
*.log
```

> `docs/docs/` 与 `docs/_static/` 是构建时的临时拷贝目录，**不应该提交**。真正的内容源在 `content/<VERSION>/` 下。

### 必须提交的目录与文件

```
✅ content/                              ← 全部三个版本内容源
✅ projects/ROSOrin/en/                  ← 构建产物（用于部署）
✅ docs/.vitepress/                       ← 主题、配置
✅ docs/index.md                          ← 默认入口（构建时会临时覆盖）
✅ docs/.vitepress/theme/PageRedirect.vue ← 重定向组件
✅ scripts/build_version.mjs              ← 构建脚本
✅ scripts/stage_main_site.mjs            ← 产物拷贝脚本
✅ package.json                           ← 构建脚本入口
✅ index.html                             ← 根目录版本选择页
✅ MULTI_VERSION_DEPLOY.md                ← 本说明文档
```

### 推荐提交流程

```bash
# 1. 确保三个版本内容源已更新
git status content/

# 2. 重新构建全部三个版本（必做！避免提交旧产物）
npm run build:all

# 3. 提交改动
git add content/ projects/ scripts/ docs/.vitepress/ package.json index.html MULTI_VERSION_DEPLOY.md docs/index.md
git commit -m "build(ROSOrin): rebuild all three versions (jetson-orin-nano / jetson-nano / raspberry-pi)"
git push origin main
```

---

## 六、服务器部署（宝塔 + Nginx 反向代理 + GitHub Pages）

### 方案 A：直接同步 `projects/` 目录到服务器

使用 `rsync` 或宝塔文件管理器上传：

```
本 地： projects/ROSOrin/en/*
服务器： <BAOTA_SITE_DIR>/projects/ROSOrin/en/*
```

例如：

```bash
rsync -avz --delete projects/ROSOrin/en/ user@server:/www/wwwroot/wiki/projects/ROSOrin/en/
```

### 方案 B：GitHub Pages + Nginx 反代（生产推荐）

GitHub Pages 部署仓库 `main` 分支后，Nginx 反代配置如下（三版本）：

```nginx
location /projects/ROSOrin/en/jetson-orin-nano-version/ {
    proxy_pass https://<USER>.github.io/ROSOrin-vite/projects/ROSOrin/en/jetson-orin-nano-version/;
    proxy_set_header Host <USER>.github.io;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_ssl_server_name on;
    sub_filter_once off;
    sub_filter_types text/css application/javascript application/json text/html;
    sub_filter '<USER>.github.io/ROSOrin-vite/' 'wiki.hiwonder.com/';
}

location /projects/ROSOrin/en/jetson-nano-version/ {
    proxy_pass https://<USER>.github.io/ROSOrin-vite/projects/ROSOrin/en/jetson-nano-version/;
    proxy_set_header Host <USER>.github.io;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_ssl_server_name on;
    sub_filter_once off;
    sub_filter_types text/css application/javascript application/json text/html;
    sub_filter '<USER>.github.io/ROSOrin-vite/' 'wiki.hiwonder.com/';
}

location /projects/ROSOrin/en/raspberry-pi-version/ {
    proxy_pass https://<USER>.github.io/ROSOrin-vite/projects/ROSOrin/en/raspberry-pi-version/;
    proxy_set_header Host <USER>.github.io;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_ssl_server_name on;
    sub_filter_once off;
    sub_filter_types text/css application/javascript application/json text/html;
    sub_filter '<USER>.github.io/ROSOrin-vite/' 'wiki.hiwonder.com/';
}
```

> 注意：如果服务器使用 `wiki-test.hiwonder.com`（测试环境），将 `wiki.hiwonder.com` 替换为测试域名即可。

---

## 七、最终可访问地址验证清单

| 地址 | 预期结果 | 对应首篇 md |
|------|----------|-------------|
| `https://wiki.hiwonder.com/projects/ROSOrin/en/jetson-orin-nano-version/` | 302→首页→自动跳转到 Pro 用户手册 | `1_ROSOrin_Pro_User_Manual.md` |
| `https://wiki.hiwonder.com/projects/ROSOrin/en/jetson-orin-nano-version/docs/1_ROSOrin_Pro_User_Manual.html` | 直接打开 Pro 用户手册 ✅ | `1_ROSOrin_Pro_User_Manual.md` |
| `https://wiki.hiwonder.com/projects/ROSOrin/en/jetson-nano-version/` | 302→首页→自动跳转到标准用户手册 | `1_ROSOrin_User_Manual.md` |
| `https://wiki.hiwonder.com/projects/ROSOrin/en/jetson-nano-version/docs/1_ROSOrin_User_Manual.html` | 直接打开标准用户手册 ✅ | `1_ROSOrin_User_Manual.md` |
| `https://wiki.hiwonder.com/projects/ROSOrin/en/raspberry-pi-version/` | 302→首页→自动跳转到标准用户手册 | `1_ROSOrin_User_Manual.md` |
| `https://wiki.hiwonder.com/projects/ROSOrin/en/raspberry-pi-version/docs/1_ROSOrin_User_Manual.html` | 直接打开标准用户手册 ✅ | `1_ROSOrin_User_Manual.md` |
| 任意页面顶部「Version 下拉」 | 可切换到另外两个版本并跳转到该版本首页 | - |

---

## 八、常见问题排查

### Q1：`npm run build:all` 报错 `ENOENT: no such file or directory, open '.../content/V1.1/docs/index.md'`

**现象**：
```
Error: ENOENT: no such file or directory, open 'E:\...\ROSOrin-vite\content\V1.1\docs\index.md'
```

**根因**：`package.json` 的脚本与 `scripts/build_version.mjs` 被还原为其他项目（如 miniHexa）的 `v1.1 / v1.2` 配置。

**修复**：
1. `package.json` 中 `build:all` 改为：
   ```
   "build:all": "npm run build:jetson-orin-nano && npm run build:jetson-nano && npm run build:raspberry-pi"
   ```
2. `scripts/build_version.mjs` 中：
   - `projectName = 'ROSOrin'`
   - `validVersions = ['jetson-orin-nano-version', 'jetson-nano-version', 'raspberry-pi-version']`
   - `contentDirName = version`（不需要版本名→目录名的映射）
3. `scripts/stage_main_site.mjs` 中 `projectName = 'ROSOrin'`
4. `docs/.vitepress/config.mts` 中 `docsBase` 默认值改为 `/projects/ROSOrin/en/jetson-orin-nano-version/`

---

### Q2：访问 Jetson Orin Nano 版本打开了 `1_ROSOrin_User_Manual.html` 而不是 `1_ROSOrin_Pro_User_Manual.html`

**根因**：`content/jetson-orin-nano-version/docs/index.md` 中的 `redirectTo` 写错了（或没单独配置）。

**修复**：确保 Jetson Orin Nano 的 `index.md` 明确指向 Pro 版本：
```
redirectTo: /docs/1_ROSOrin_Pro_User_Manual.html
```
另外两个版本使用普通版本：
```
redirectTo: /docs/1_ROSOrin_User_Manual.html
```

---

### Q3：访问 Jetson Nano 或 Raspberry Pi 版本直接 404

**根因 A**：构建产物 `projects/ROSOrin/en/jetson-nano-version/` 或 `raspberry-pi-version/` 目录不存在或为空。

修复：重新跑 `npm run build:jetson-nano` 与 `npm run build:raspberry-pi`，或直接 `npm run build:all`。

**根因 B**：Nginx 反代路径不一致（少了 `/projects/ROSOrin/en/<VERSION>/` 前缀）。

修复：检查 Nginx `location` 与 `proxy_pass` 路径是否完整匹配三版本各自的 base path。

---

### Q4：页面内图片显示 404（路径中出现反斜杠 `\`）

**根因**：Markdown 中引用图片路径使用 Windows 风格 `\_static\xxx\yyy.png`，构建时未正确转换。

**修复**：`docs/.vitepress/config.mts` 中已内置 `normalizeImagePathSlashes()` Vite 插件，会自动把 `\` 替换为 `/`；如果仍然失败，检查 `config.mts` 的 `vite.plugins` 数组里是否第一个启用了该插件。

---

### Q5：Markdown 中引用了缺失图片导致构建报错

**根因**：VitePress 在 Rollup 阶段会尝试把本地图片作为资源打包，如果路径指向不存在的文件会直接报错中止。

**修复**：`docs/.vitepress/config.mts` 中已内置 `ignore-missing-images` Vite 插件（enforce: `pre`）。遇到缺失图片时会打印警告 `[missing-image] Skipping missing image: ...`，然后用 1×1 透明 SVG 占位替换，保证构建能继续。构建完成后根据警告列表补齐图片即可。

---

### Q6：版本切换下拉没出现在导航栏

**根因 A**：`docs/.vitepress/theme/Layout.vue` 中 `ALL_VERSIONS` 仍为 `['v1.1', 'v1.2']`，与当前路径 `/en/jetson-orin-nano-version/` 等不匹配。

修复：
```ts
const ALL_VERSIONS = ['jetson-orin-nano-version', 'jetson-nano-version', 'raspberry-pi-version']
```

**根因 B**：VitePress DOM 结构更新，`document.querySelector('.VPNavBarMenu')` 取不到元素。

修复：根据最新 VitePress 调整注入位置的选择器（通常仍然是 `.VPNavBarMenu`）。

---

### Q7：构建失败 `Vite requires Node.js version 20.19+ / 22.12+`

**根因**：使用了 Node 18 或更低版本的 Node。

修复：Docker 中用 `node:20.19-alpine`（明确版本号）；本地 `nvm install 20.19.0 && nvm use 20.19.0`。

---

## 九、快速开始总览（TL;DR）

第一次 / 每次发布完整走一遍：

```bash
# 1. 更新各版本 content/ 下文档与资源
# ...

# 2. 构建 Jetson Orin Nano（单独验证 Pro 首文档重定向）
npm run build:jetson-orin-nano

# 3. 构建另两个版本
npm run build:jetson-nano
npm run build:raspberry-pi

#    或者一步到位（顺序执行三件事）：
#    npm run build:all

# 4. 检查 projects/ROSOrin/en/ 下三个子目录都有正确的 index.html 与 docs/*
ls projects/ROSOrin/en/

# 5. 提交并推送
git add content projects scripts docs/.vitepress package.json index.html MULTI_VERSION_DEPLOY.md docs/index.md
git commit -m "build(ROSOrin): rebuild all versions"
git push origin main
```
