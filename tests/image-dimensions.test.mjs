import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const styles = readFileSync(resolve(root, 'src/styles.css'), 'utf8')
const imageFiles = [
  'game-ladder-web.png',
  'game-stop-web.png',
  'takeaway-cup-web.png',
  'takeaway-cutaway-web.png',
  'takeaway-overflow-web.png',
  'takeaway-win-web.png',
]

function pngDimensions(filename) {
  const png = readFileSync(resolve(root, 'public/assets', filename))
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  }
}

function cssRules(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [...styles.matchAll(new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`, 'g'))]
    .map((match) => match[1])
}

describe('rendered image assets', () => {
  it.each(imageFiles)('keeps %s at the declared square aspect ratio', (filename) => {
    expect(pngDimensions(filename)).toEqual({ width: 512, height: 512 })
  })

  it.each(['.editorial-intro img', '.pick-cup img', '.takeaway-stage'])('keeps responsive %s boxes at the square asset ratio', (selector) => {
    const rules = cssRules(selector)

    expect(rules.length).toBeGreaterThan(0)
    expect(rules[0]).toMatch(/\bheight:\s*auto\b/)
    expect(rules.slice(1).some((rule) => /\bheight:\s*\d/.test(rule))).toBe(false)
  })

  it('keeps compact receipt images square', () => {
    expect(cssRules('.receipt-panel .pick-cup img')[0]).toMatch(/\bwidth:\s*70px;\s*height:\s*70px\b/)
  })
})
