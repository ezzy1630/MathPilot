import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const srcDir = dirname(fileURLToPath(import.meta.url))
const owned = ['checkAnswer.ts', 'symbolicCheck.ts', 'contracts.ts', 'desktopAdapter.ts']

describe('math-engine package ownership', () => {
  it('core grading modules do not import apps/desktop', () => {
    for (const file of owned) {
      const body = readFileSync(join(srcDir, file), 'utf8')
      expect(body.includes('apps/desktop'), `${file} must remain package-owned`).toBe(false)
    }
  })
})
