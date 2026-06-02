#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = path.join(root, 'packages')
const ENGINE_PACKAGES = new Set(['learning-engine', 'math-engine'])

const ALLOWED_DESKTOP_IMPORT_FILES = new Set([
  'index.ts',
  'contracts.ts',
  'desktopAdapter.ts',
])

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, out)
    else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.test.ts')
    ) {
      out.push(full)
    }
  }
  return out
}

const violations = []

for (const pkgDir of await readdir(packagesDir, { withFileTypes: true })) {
  if (!pkgDir.isDirectory() || !ENGINE_PACKAGES.has(pkgDir.name)) continue
  const srcDir = path.join(packagesDir, pkgDir.name, 'src')
  try {
    for (const file of await walk(srcDir)) {
      const rel = path.relative(srcDir, file)
      const base = path.basename(file)
      const body = await readFile(file, 'utf8')
      if (!body.includes('apps/desktop')) continue
      if (ALLOWED_DESKTOP_IMPORT_FILES.has(base)) continue
      violations.push(`${pkgDir.name}/${rel}`)
    }
  } catch {
    // package without src/
  }
}

if (violations.length) {
  console.error('Engine boundary violations (packages must not import apps/desktop except index/contracts/desktopAdapter):')
  for (const file of violations) console.error(`  - ${file}`)
  process.exit(1)
}

console.log('Engine package boundaries OK.')
