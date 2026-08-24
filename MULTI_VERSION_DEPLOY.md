# 多版本文档部署模板（VitePress Multi-Version）

> 通用模板，适用于任意需要在同一仓库支持多个文档版本的 VitePress 项目。
> 每个版本独立构建，共享同一个 `main` 分支，通过宝塔 Nginx 反向代理统一对外提供服务。

---

## 占位符定义

使用前请替换以下占位符：

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `<PROJECT>` | URL 路由中的项目标识 | `JetAcker` |
| `<REPO>` | GitHub 仓库名称 | `JetAcker-vite` |
| `<ORG>` | GitHub 组织/用户名 | `hiwonder-docs` |
| `<DOMAIN>` | 生产环境域名 | `wiki.hiwonder.com` |
| `<VERSION1>` | 第一个版本标识（目录名） | `jetacker-orin-nano` |
| `<VERSION1_LABEL>` | 第一个版本显示名 | `JetAcker Orin Nano` |
| `<VERSION2>` | 第二个版本标识（目录名） | `jetacker-jetson-nano` |
| `<VERSION2_LABEL>` | 第二个版本显示名 | `JetAcker Jetson Nano` |
| `<HOME_URL>` | 导航栏 Home 链接 | `https://www.hiwonder.net/` |
| `<FIRST_FILE>` | 第一章文件名（不含 .md） | `1.getting_ready` |

---

## 一、需要修改的文件清单

搭建一个新项目需要修改以下 **7 个文件**：

| # | 文件 | 修改内容 |
|---|------|----------|
| 1 | `package.json` | 添加 `dev:<版本>` / `build:<版本>` 脚本 |
| 2 | `scripts/build_version.mjs` | 项目名、版本列表 |
| 3 | `scripts/dev_version.mjs` | 项目名、版本列表 |
| 4 | `scripts/stage_main_site.mjs` | 项目名 |
| 5 | `docs/.vitepress/config.mts` | base 路径、标题、导航栏版本切换器 |
| 6 | `docs/.vitepress/theme/Layout.vue` | 版本切换器标签和路径判断 |
| 7 | `docs/index.md` | 首页重定向 `redirectTo` |
| 8 | `index.html` | 版本选择页链接和标题 |

---

## 二、各文件修改详情

### 2.1 `package.json`

```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "dev:<版本1>": "node scripts/dev_version.mjs <版本1>",
    "dev:<版本2>": "node scripts/dev_version.mjs <版本2>",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs",
    "docs:stage-main": "node scripts/stage_main_site.mjs",
    "build:<版本1>": "node scripts/build_version.mjs <版本1>",
    "build:<版本2>": "node scripts/build_version.mjs <版本2>",
    "build:all": "node scripts/build_version.mjs <版本1> && node scripts/build_version.mjs <版本2>"
  }
}
```

> 💡 新增版本时，只需复制一行 `dev:<版本>` 和 `build:<版本>` 即可。

### 2.2 `scripts/build_version.mjs`（核心构建脚本）

```javascript
import { rm, cp } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(__dirname, '..')

const version = process.argv[2]
if (!version) {
  console.error('Usage: node scripts/build_version.mjs <version>')
  process.exit(1)
}

// ↓↓↓ 修改此处：版本列表 ↓↓↓
const validVersions = ['<版本1>', '<版本2>']
if (!validVersions.includes(version)) {
  console.error(`Invalid version: ${version}`)
  console.error(`Valid versions: ${validVersions.join(', ')}`)
  process.exit(1)
}

// ↓↓↓ 修改此处：项目名 ↓↓↓
const projectName = '<PROJECT>'
const docsBase = `/projects/${projectName}/en/${version}/`

console.log(`\n========== Building ${version} ==========`)
console.log(`DOCS_BASE: ${docsBase}`)

// 1. 复制内容文件
const contentDir = join(repositoryRoot, 'content', version)
const docsDocsDir = join(repositoryRoot, 'docs', 'docs')
const docsStaticDir = join(repositoryRoot, 'docs', '_static')
const publicDir = join(repositoryRoot, 'docs', 'public')
const projectTargetDir = join(repositoryRoot, 'projects', projectName, 'en', version)

console.log('\n[1/3] Copying content files...')
await rm(docsDocsDir, { recursive: true, force: true })
await rm(docsStaticDir, { recursive: true, force: true })
await cp(join(contentDir, 'docs'), docsDocsDir, { recursive: true })
await cp(join(contentDir, '_static'), docsStaticDir, { recursive: true })
console.log('  Done.')

// 2. 执行构建
console.log('\n[2/3] Building with VitePress...')
const vitepressBin = join(repositoryRoot, 'node_modules', '.bin', 'vitepress.cmd')

const result = await new Promise((resolve, reject) => {
  const child = spawn(vitepressBin, ['build', 'docs'], {
    stdio: 'inherit',
    cwd: repositoryRoot,
    env: { ...process.env, DOCS_BASE: docsBase, DOCS_VERSION: version }
  })
  child.on('exit', resolve)
  child.on('error', reject)
})

if (result !== 0) {
  console.error('\nBuild failed!')
  process.exit(result ?? 1)
}
console.log('  Build complete.')

// 3. 整理产物
console.log('\n[3/3] Moving output to projects directory...')
const sourceDir = join(repositoryRoot, 'docs', '.vitepress', 'dist')
await rm(projectTargetDir, { recursive: true, force: true })
await cp(sourceDir, projectTargetDir, { recursive: true })

// 复制 public 资源
if (await exists(publicDir)) {
  await cp(publicDir, join(projectTargetDir, 'public'), { recursive: true })
}

// 复制 index.html（版本选择页）
await cp(join(repositoryRoot, 'index.html'), join(projectTargetDir, 'index.html'), { force: true })

console.log(`  Output: projects/${projectName}/en/${version}/`)
console.log(`\n========== Done ==========\n`)
```

### 2.3 `scripts/dev_version.mjs`（dev 预览脚本）

```javascript
import { rm, cp } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(__dirname, '..')

const version = process.argv[2]
if (!version) {
  console.error('Usage: node scripts/dev_version.mjs <version>')
  process.exit(1)
}

// ↓↓↓ 修改此处：版本列表（与 build_version.mjs 保持一致）↓↓↓
const validVersions = ['<版本1>', '<版本2>']
if (!validVersions.includes(version)) {
  console.error(`Invalid version: ${version}`)
  process.exit(1)
}

// ↓↓↓ 修改此处：项目名 ↓↓↓
const projectName = '<PROJECT>'
const docsBase = `/projects/${projectName}/en/${version}/`

console.log(`\n========== Dev ${version} ==========`)
console.log(`DOCS_BASE: ${docsBase}`)

// 1. 复制内容
const contentDir = join(repositoryRoot, 'content', version)
const docsDocsDir = join(repositoryRoot, 'docs', 'docs')
const docsStaticDir = join(repositoryRoot, 'docs', '_static')

console.log('\n[1/2] Copying content files...')
await rm(docsDocsDir, { recursive: true, force: true })
await rm(docsStaticDir, { recursive: true, force: true })
await cp(join(contentDir, 'docs'), docsDocsDir, { recursive: true })
await cp(join(contentDir, '_static'), docsStaticDir, { recursive: true })
console.log('  Done.')

// 2. 启动 dev 服务器
console.log('\n[2/2] Starting VitePress dev server...')
const dev = spawn('npx', ['vitepress', 'dev', 'docs'], {
  stdio: 'inherit',
  cwd: repositoryRoot,
  env: { ...process.env, DOCS_BASE: docsBase, DOCS_VERSION: version },
  shell: true
})
dev.on('exit', (code) => process.exit(code ?? 0))
```

### 2.4 `scripts/stage_main_site.mjs`

```javascript
// ↓↓↓ 修改此处：项目名 ↓↓↓
const projectName = '<PROJECT>'
// ↓↓↓ 修改此处：默认版本 ↓↓↓
const version = process.env.DOCS_VERSION || '<版本1>'
const targetDir = join(repositoryRoot, `projects/${projectName}/en/${version}`)
```

### 2.5 `docs/.vitepress/config.mts`

```typescript
import { defineConfig } from 'vitepress'

// ↓↓↓ 修改此处：默认 base 路径（构建时会被环境变量覆盖）↓↓↓
const docsBase = normalizeBase(
  process.env.DOCS_BASE || '/projects/<PROJECT>/en/<版本1>/'
)

export default defineConfig({
  base: docsBase,
  // ↓↓↓ 修改此处：标题 ↓↓↓
  title: '<PROJECT> Documentation',
  description: '<PROJECT> robot documentation',
  head: [['link', { rel: 'icon', href: `${docsBase}favicon.ico` }]],

  themeConfig: {
    // ↓↓↓ 修改此处：导航栏版本切换器 ↓↓↓
    nav: [
      {
        text: 'Version',
        items: [
          { text: '<版本1_LABEL>', link: '/projects/<PROJECT>/en/<版本1>/' },
          { text: '<版本2_LABEL>', link: '/projects/<PROJECT>/en/<版本2>/' }
        ]
      },
      // ↓↓↓ 修改此处：Home 链接 ↓↓↓
      { text: 'Home', link: '<HOME_URL>', target: '_self' }
    ],

    // ... 其余配置保持不变
  }
})
```

### 2.6 `docs/.vitepress/theme/Layout.vue`

```vue
<script setup lang="ts">
import { useRoute } from 'vitepress'
import { injectVersionSwitcher } from './versionSwitcher'

injectVersionSwitcher()

const route = useRoute()
</script>

<template>
  <Layout>
    <template #default>
      <Content />
    </template>
  </Layout>
</template>
```

创建 `docs/.vitepress/theme/versionSwitcher.ts`：

```typescript
import { inBrowser } from 'vitepress'

export function injectVersionSwitcher() {
  if (!inBrowser) return
  const navList = document.querySelector('.VPNavBarMenu')
  if (!navList) return
  if (navList.querySelector('.version-switcher')) return

  // ↓↓↓ 修改此处：版本判断逻辑 ↓↓↓
  const current = location.pathname.includes('/en/<版本1>/') ? '<版本1>' : '<版本2>'

  // ↓↓↓ 修改此处：版本标签 ↓↓↓
  const labels: Record<string, string> = {
    '<版本1>': '<版本1_LABEL>',
    '<版本2>': '<版本2_LABEL>'
  }

  const li = document.createElement('li')
  li.className = 'version-switcher'
  li.innerHTML = `
    <span class="version-switcher__label">Version</span>
    <button type="button" class="version-switcher__trigger">
      <span class="version-switcher__name">${labels[current]}</span>
    </button>
    <ul class="version-switcher__menu" style="display:none">
      <li class="version-switcher__item ${current === '<版本1>' ? 'is-selected' : ''}" data-version="<版本1>"><版本1_LABEL></li>
      <li class="version-switcher__item ${current === '<版本2>' ? 'is-selected' : ''}" data-version="<版本2>"><版本2_LABEL></li>
    </ul>
  `

  // 添加样式
  const style = document.createElement('style')
  style.textContent = `
    .version-switcher { position: relative; display: inline-block; }
    .version-switcher__trigger { padding: 6px 12px; background: transparent; border: 1px solid var(--vp-c-divider); border-radius: 6px; cursor: pointer; color: var(--vp-c-text-1); font-size: 14px; display: flex; align-items: center; gap: 6px; }
    .version-switcher__trigger:hover { background: var(--vp-c-bg-soft); }
    .version-switcher__menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); min-width: 180px; list-style: none; padding: 4px 0; z-index: 100; }
    .version-switcher__item { padding: 8px 16px; cursor: pointer; font-size: 14px; }
    .version-switcher__item:hover { background: var(--vp-c-bg-soft); }
    .version-switcher__item.is-selected { color: var(--vp-c-brand-1); font-weight: 600; }
  `
  document.head.appendChild(style)

  navList.appendChild(li)

  const trigger = li.querySelector('.version-switcher__trigger')!
  const menu = li.querySelector('.version-switcher__menu')!
  const items = li.querySelectorAll('.version-switcher__item')!

  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none'
  })

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const v = (item as HTMLElement).dataset.version
      if (v) {
        // ↓↓↓ 修改此处：版本切换 URL 逻辑 ↓↓↓
        const newPath = location.pathname.replace(/\/en\/[^/]+\//, `/en/${v}/`)
        location.href = newPath
      }
    })
  })

  document.addEventListener('click', () => {
    menu.style.display = 'none'
  })
}
```

### 2.7 `docs/index.md`

```markdown
---
layout: page
---

<script setup>
import { onMounted } from 'vue'
import { useData } from 'vitepress'

const { site, themeConfig } = useData()

onMounted(() => {
  // ↓↓↓ 修改此处：第一章文件名 ↓↓↓
  const target = '/<FIRST_FILE>.html'
  const base = site.value.base
  window.location.replace(base + target)
})
</script>

<div style="display:flex;justify-content:center;align-items:center;min-height:60vh;color:#888;">
正在跳转到内容页面...
</div>
```

> ⚠️ 如果第一章文件名变更，必须同步修改此处的 `target` 路径。

### 2.8 `index.html`（版本选择页）

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <!-- ↓↓↓ 修改此处：项目名 ↓↓↓ -->
  <title><PROJECT> Documentation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; }
    h1 { color: #333; margin-bottom: 30px; }
    .versions { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }
    .version-card { display: block; width: 260px; padding: 30px 20px; background: #fff; border-radius: 12px; text-decoration: none; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; }
    .version-card:hover { transform: translateY(-4px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .version-card h2 { margin: 0 0 8px; font-size: 20px; }
    .version-card p { margin: 0; color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- ↓↓↓ 修改此处：项目名 ↓↓↓ -->
    <h1><PROJECT> Documentation</h1>
    <div class="versions">
      <!-- ↓↓↓ 修改此处：版本1 ↓↓↓ -->
      <a class="version-card" href="/projects/<PROJECT>/en/<版本1>/">
        <h2><版本1_LABEL></h2>
        <p>版本1 说明</p>
      </a>
      <!-- ↓↓↓ 修改此处：版本2 ↓↓↓ -->
      <a class="version-card" href="/projects/<PROJECT>/en/<版本2>/">
        <h2><版本2_LABEL></h2>
        <p>版本2 说明</p>
      </a>
    </div>
  </div>
</body>
</html>
```

---

## 三、目录结构要求

```
<REPO>/
├── content/                        ← 源文件（放文档的地方）
│   ├── <版本1>/
│   │   ├── docs/                   ← Markdown 文件
│   │   │   └── *.md
│   │   └── _static/                ← 图片等静态资源
│   │       └── media/
│   └── <版本2>/
│       ├── docs/
│       │   └── *.md
│       └── _static/
│           └── media/
├── docs/                           ← VitePress 工作目录
│   ├── .vitepress/
│   │   ├── config.mts              ← VitePress 配置
│   │   ├── autoSidebar.mts
│   │   └── theme/
│   │       ├── Layout.vue          ← 版本切换器注入
│   │       ├── versionSwitcher.ts  ← 版本切换器逻辑
│   │       └── custom.css
│   ├── docs/                       ← 构建时临时存放 Markdown
│   ├── _static/                    ← 构建时临时存放资源
│   ├── public/
│   └── index.md                    ← 首页重定向
├── scripts/
│   ├── build_version.mjs           ← 构建脚本（核心）
│   ├── dev_version.mjs             ← dev 预览脚本
│   └── stage_main_site.mjs         ← 构建产物整理
├── projects/                       ← 构建产物
│   └── <PROJECT>/
│       └── en/
│           ├── <版本1>/
│           └── <版本2>/
├── .nojekyll
├── .gitignore
├── index.html                      ← 版本选择页
├── package.json
├── package-lock.json
└── README.md
```

---

## 四、部署流程

### 第一步：准备文档内容

```bash
# 版本1
content/<版本1>/docs/*.md
content/<版本1>/_static/**/*

# 版本2
content/<版本2>/docs/*.md
content/<版本2>/_static/**/*
```

### 第二步：本地构建验证

```bash
# 安装依赖（首次）
npm ci

# 构建所有版本
npm run build:all

# 单独构建
npm run build:<版本1>
npm run build:<版本2>
```

检查产物：
```
projects/<PROJECT>/en/
├── <版本1>/
│   ├── assets/
│   ├── docs/
│   └── index.html
└── <版本2>/
    ├── assets/
    ├── docs/
    └── index.html
```

**关键检查**：打开 `projects/<PROJECT>/en/<版本>/index.html`，确认 CSS 路径为：
```
/projects/<PROJECT>/en/<版本>/assets/xxx.css
```

### 第三步：本地预览（开发模式）

```bash
# 启动版本1
npm run dev:<版本1>
# 访问: http://localhost:5173/projects/<PROJECT>/en/<版本1>/

# 启动版本2
npm run dev:<版本2>
# 访问: http://localhost:5173/projects/<PROJECT>/en/<版本2>/
```

> ⚠️ 必须使用 `dev:<版本>` 而非 `docs:dev`。
> `docs:dev` 不设置 `DOCS_BASE` 环境变量，会导致 base 路径不匹配。

### 第四步：提交推送到 GitHub

```bash
git add -A
git commit -m "update: 更新 <版本1>/<版本2> 版本文档"
git push origin main
```

### 第五步：配置 GitHub Pages

1. Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main` / `root`
4. Custom domain 留空

验证直连：
```
https://<ORG>.github.io/<REPO>/projects/<PROJECT>/en/<版本1>/
https://<ORG>.github.io/<REPO>/projects/<PROJECT>/en/<版本2>/
```

### 第六步：配置宝塔 Nginx

```nginx
# <版本1>
location ^~ /projects/<PROJECT>/en/<版本1>/ {
    proxy_pass https://<ORG>.github.io/<REPO>/projects/<PROJECT>/en/<版本1>/;
    proxy_set_header Host <ORG>.github.io;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_ssl_server_name on;
}

# <版本2>
location ^~ /projects/<PROJECT>/en/<版本2>/ {
    proxy_pass https://<ORG>.github.io/<REPO>/projects/<PROJECT>/en/<版本2>/;
    proxy_set_header Host <ORG>.github.io;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_ssl_server_name on;
}
```

保存并重载 Nginx。

### 第七步：验证

```
https://<DOMAIN>/projects/<PROJECT>/en/<版本1>/
https://<DOMAIN>/projects/<PROJECT>/en/<版本2>/
```

- 页面正常打开、样式正常 → 部署成功
- 版本切换器可在两个版本间跳转
- 图片显示正常

---

## 五、新增版本

只需修改以下文件：

1. **`package.json`**：添加 `dev:<新版本>` 和 `build:<新版本>` 脚本
2. **`scripts/build_version.mjs`**：`validVersions` 数组添加新版本
3. **`scripts/dev_version.mjs`**：`validVersions` 数组添加新版本
4. **`scripts/stage_main_site.mjs`**：默认版本改为新版本
5. **`docs/.vitepress/config.mts`**：`nav` 添加新版本链接
6. **`docs/.vitepress/theme/versionSwitcher.ts`**：添加新版本标签和判断逻辑
7. **`index.html`**：添加新版本卡片

---

## 六、常见问题

### Q1: dev 模式报 MIME type 错误

**原因**：使用了 `docs:dev` 而非 `dev:<版本>`，导致 base 路径不匹配。

**解决**：使用 `npm run dev:<版本>`。

### Q2: CSS 丢失

**原因**：`DOCS_BASE` 未正确设置，或构建产物路径错误。

**检查**：
1. 打开 `projects/<PROJECT>/en/<版本>/index.html`，检查 CSS 路径
2. 确认 base 配置为 `/projects/<PROJECT>/en/<版本>/`
3. 重新执行 `npm run build:all`

### Q3: 首页跳转 404

**原因**：`docs/index.md` 中 `target` 指向的文件名与实际不符。

**解决**：修改 `docs/index.md` 中的 `<FIRST_FILE>` 为实际第一章文件名。

### Q4: 版本切换器跳转链接不对

**原因**：`config.mts` 的 `nav` 或 `versionSwitcher.ts` 中的路径错误。

**检查**：
- `nav` 中的 `link` 使用绝对路径（以 `/` 开头）
- 路径格式：`/projects/<PROJECT>/en/<版本>/`
- `versionSwitcher.ts` 中的 `replace` 正则 `/\/en\/[^/]+\//` 正确

### Q5: Nginx 配置报错

**检查**：
- `proxy_pass` URL 不要用反引号包裹
- location 规则使用 `^~` 前缀
- 以分号 `;` 结尾
