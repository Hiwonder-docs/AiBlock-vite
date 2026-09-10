import { access, cp, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(__dirname, '..')

const version = process.argv[2] || 'latest'
const validVersions = ['latest', 'starter-kit', 'standard-kit', 'advanced-kit']

if (!validVersions.includes(version)) {
  console.error(`Invalid version: ${version}`)
  console.error(`Valid versions: ${validVersions.join(', ')}`)
  process.exit(1)
}

const projectName = 'AiBlock'
const docsBase = `/projects/${projectName}/en/${version}/`
const contentDir = join(repositoryRoot, 'content', version)
const contentDocsDir = join(contentDir, 'docs')
const contentStaticDir = join(contentDir, '_static')
const docsDocsDir = join(repositoryRoot, 'docs', 'docs')
const docsStaticDir = join(repositoryRoot, 'docs', '_static')
const rootIndexPath = join(repositoryRoot, 'docs', 'index.md')
const versionRootIndexPath = join(contentDir, 'index.md')

const originalRootIndex = await readFile(rootIndexPath, 'utf8')
const rootRedirectTarget = version === 'advanced-kit'
  ? '/docs/1.%20Kit%20Introduction.html'
  : '/docs/index.html'
const rootRedirectIndex = `---
layout: page-redirect
redirectTo: ${rootRedirectTarget}
---

Redirecting to content page...
`

await writeFile(rootIndexPath, rootRedirectIndex)
await rm(docsDocsDir, { recursive: true, force: true })
await rm(docsStaticDir, { recursive: true, force: true })

if (await pathExists(contentDocsDir)) {
  await cp(contentDocsDir, docsDocsDir, { recursive: true })
} else {
  await mkdir(docsDocsDir, { recursive: true })
  await cp(versionRootIndexPath, join(docsDocsDir, 'index.md'))
}

if (await pathExists(contentStaticDir)) {
  await cp(contentStaticDir, docsStaticDir, { recursive: true })
} else {
  await mkdir(docsStaticDir, { recursive: true })
}

console.log(`\n========== Previewing ${version} ==========`)
console.log(`DOCS_BASE: ${docsBase}`)

const devServer = spawn('npx', ['vitepress', 'dev', 'docs'], {
  stdio: 'inherit',
  cwd: repositoryRoot,
  shell: true,
  env: { ...process.env, DOCS_BASE: docsBase, DOCS_VERSION: version }
})

let restored = false
async function restoreRootIndex() {
  if (restored) return
  restored = true
  await writeFile(rootIndexPath, originalRootIndex).catch(() => {})
}

process.on('SIGINT', async () => {
  await restoreRootIndex()
  process.exit(130)
})

process.on('SIGTERM', async () => {
  await restoreRootIndex()
  process.exit(143)
})

devServer.on('exit', async (code) => {
  await restoreRootIndex()
  process.exit(code ?? 0)
})

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
