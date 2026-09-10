import { access, mkdir, rm, cp, readdir, readFile, writeFile, unlink } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join, extname, basename } from 'path'
import { setTimeout as delay } from 'timers/promises'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(__dirname, '..')

const projectName = process.env.DOCS_PROJECT || 'AiBlock'
const version = process.env.DOCS_VERSION || process.argv[2]

if (!version) {
  console.error('Usage: DOCS_VERSION=<version> npm run docs:stage-main')
  console.error('Example: node scripts/stage_main_site.mjs latest')
  process.exit(1)
}

const targetDir = join(repositoryRoot, 'projects', projectName, 'en', version)
await rm(targetDir, { recursive: true, force: true })
await mkdir(targetDir, { recursive: true })

await cp(
  join(repositoryRoot, 'docs/.vitepress/dist'),
  targetDir,
  { recursive: true }
)

await convertRasterImagesToWebp(targetDir)
await copyPdfAssets(targetDir)

console.log('Staged files to:', targetDir)

async function copyPdfAssets(targetDir) {
  const pdfSourceDir = join(repositoryRoot, 'content', version, '_static', 'shared', 'pdf')
  if (!await pathExists(pdfSourceDir)) {
    return
  }

  await cp(
    pdfSourceDir,
    join(targetDir, '_static', 'shared', 'pdf'),
    { recursive: true }
  )
}

async function walkFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = join(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkFiles(entryPath))
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }

  return files
}

function isConvertibleRasterImage(filePath) {
  const extension = extname(filePath).toLowerCase()
  return extension === '.png' || extension === '.jpg' || extension === '.jpeg'
}

function isTextAsset(filePath) {
  const extension = extname(filePath).toLowerCase()
  return (
    extension === '.html' ||
    extension === '.js' ||
    extension === '.css' ||
    extension === '.json' ||
    extension === '.mjs' ||
    extension === '.txt' ||
    extension === '.xml' ||
    extension === '.svg' ||
    extension === '.md' ||
    extension === '.map'
  )
}

async function convertRasterImagesToWebp(rootDir) {
  const allFiles = await walkFiles(rootDir)
  const rasterFiles = allFiles.filter(isConvertibleRasterImage)
  const replacements = new Map()

  for (const filePath of rasterFiles) {
    const webpPath = filePath.replace(/\.(png|jpe?g)$/i, '.webp')
    await sharp(filePath)
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
      .toFile(webpPath)
    await unlink(filePath)
    replacements.set(basename(filePath), basename(webpPath))
  }

  const textFiles = allFiles.filter(isTextAsset)

  for (const filePath of textFiles) {
    let content = await readFile(filePath, 'utf8')
    let changed = false

    for (const [oldName, newName] of replacements) {
      if (content.includes(oldName)) {
        content = content.split(oldName).join(newName)
        changed = true
      }
    }

    if (changed) {
      await writeTextFileWithRetry(filePath, content)
    }
  }
}

async function writeTextFileWithRetry(filePath, content, retries = 5) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await writeFile(filePath, content)
      return
    } catch (error) {
      if (attempt === retries) {
        throw error
      }

      await delay(200 * (attempt + 1))
    }
  }
}

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
