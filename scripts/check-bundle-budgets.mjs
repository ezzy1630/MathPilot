import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = path.join(repoRoot, 'apps', 'desktop', 'dist', 'assets')
const manifestPath = path.join(repoRoot, 'apps', 'desktop', 'dist', '.vite', 'manifest.json')

const budgets = {
  maxEntryKb: 360,
  maxVendorKb: 500,
  maxMathVendorKb: 850,
  maxAnyChunkKb: 1750,
}

function kb(bytes) {
  return bytes / 1024
}

if (!fs.existsSync(assetsDir)) {
  console.error(`Bundle assets not found at ${assetsDir}. Run desktop build first.`)
  process.exit(1)
}

const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {}
const manifestFiles = new Set(
  Object.values(manifest)
    .flatMap((entry) => {
      const e = entry
      return [e.file, ...(e.imports ?? []), ...(e.dynamicImports ?? [])]
    })
    .filter((name) => typeof name === 'string' && name.endsWith('.js'))
    .map((name) => path.basename(name)),
)

const files =
  manifestFiles.size > 0
    ? [...manifestFiles]
        .filter((name) => fs.existsSync(path.join(assetsDir, name)))
        .map((name) => ({
          name,
          size: fs.statSync(path.join(assetsDir, name)).size,
        }))
    : fs
        .readdirSync(assetsDir)
        .filter((name) => name.endsWith('.js'))
        .map((name) => {
          const stat = fs.statSync(path.join(assetsDir, name))
          return { name, size: stat.size, mtimeMs: stat.mtimeMs }
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .slice(0, 20)

const entryChunks = files.filter((f) => /^index-.*\.js$/.test(f.name))
const vendorChunks = files.filter((f) => f.name.includes('vendor') && !f.name.includes('math-vendor'))
const mathVendorChunks = files.filter((f) => f.name.includes('math-vendor'))

const largestEntry = entryChunks.sort((a, b) => b.size - a.size)[0]
const largestVendor = vendorChunks.sort((a, b) => b.size - a.size)[0]
const largestMathVendor = mathVendorChunks.sort((a, b) => b.size - a.size)[0]
const largestChunk = files.sort((a, b) => b.size - a.size)[0]

const failures = []

if (!largestEntry) {
  failures.push('Missing entry chunk (index-*.js).')
} else if (kb(largestEntry.size) > budgets.maxEntryKb) {
  failures.push(
    `Entry chunk ${largestEntry.name} is ${kb(largestEntry.size).toFixed(1)}KB (budget ${budgets.maxEntryKb}KB).`,
  )
}

if (largestVendor && kb(largestVendor.size) > budgets.maxVendorKb) {
  failures.push(
    `Vendor chunk ${largestVendor.name} is ${kb(largestVendor.size).toFixed(1)}KB (budget ${budgets.maxVendorKb}KB).`,
  )
}

if (largestMathVendor && kb(largestMathVendor.size) > budgets.maxMathVendorKb) {
  failures.push(
    `Math chunk ${largestMathVendor.name} is ${kb(largestMathVendor.size).toFixed(1)}KB (budget ${budgets.maxMathVendorKb}KB).`,
  )
}
if (largestChunk && kb(largestChunk.size) > budgets.maxAnyChunkKb) {
  failures.push(
    `Chunk ${largestChunk.name} is ${kb(largestChunk.size).toFixed(1)}KB (budget ${budgets.maxAnyChunkKb}KB).`,
  )
}

console.log('Bundle budget report:')
if (largestEntry) console.log(`- largest entry: ${largestEntry.name} (${kb(largestEntry.size).toFixed(1)}KB)`)
if (largestVendor) console.log(`- largest vendor: ${largestVendor.name} (${kb(largestVendor.size).toFixed(1)}KB)`)
if (largestMathVendor) {
  console.log(`- largest math vendor: ${largestMathVendor.name} (${kb(largestMathVendor.size).toFixed(1)}KB)`)
}
if (largestChunk) console.log(`- largest chunk: ${largestChunk.name} (${kb(largestChunk.size).toFixed(1)}KB)`)

if (failures.length) {
  for (const failure of failures) console.error(`BUDGET FAIL: ${failure}`)
  process.exit(1)
}

console.log('Bundle budgets passed.')
