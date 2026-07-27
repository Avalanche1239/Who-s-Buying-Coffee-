import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { build } from 'vite'

const root = resolve(import.meta.dirname, '..')
const outputDirectories = []

afterEach(() => {
  for (const directory of outputDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('deployed routes', () => {
  it('builds dedicated HTML entries for the home, roulette, and ladder routes', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whos-coffee-routes-'))
    outputDirectories.push(outDir)

    await build({
      configFile: resolve(root, 'vite.config.ts'),
      build: { outDir },
      logLevel: 'silent',
    })

    expect(existsSync(resolve(outDir, 'index.html'))).toBe(true)
    expect(existsSync(resolve(outDir, 'roulette/index.html'))).toBe(true)
    expect(existsSync(resolve(outDir, 'ladder/index.html'))).toBe(true)
  })

  it('does not fall back every unknown path to the homepage', () => {
    const wrangler = JSON.parse(readFileSync(resolve(root, 'wrangler.jsonc'), 'utf8'))
    expect(wrangler.assets.not_found_handling).toBeUndefined()
  })
})
