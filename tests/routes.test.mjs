import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { build } from 'vite'

const root = resolve(import.meta.dirname, '..')
const outputDirectories = []
const builtPages = [
  {
    path: 'index.html',
    title: "커피 내기 랜덤 게임 모음 | Who's Buying Coffee?",
    description: '룰렛, 커피 뽑기, 사다리타기 등으로 점심·커피 내기와 벌칙자를 빠르고 공정하게 정하는 무료 랜덤 게임입니다.',
    canonical: 'https://whoscoffee.site/',
    heading: '커피 내기 랜덤 게임',
  },
  {
    path: 'roulette/index.html',
    title: "랜덤 룰렛 돌리기 - 이름 추첨·벌칙자 정하기 | Who's Buying Coffee?",
    description: '참가자 이름을 입력하고 랜덤 룰렛을 돌려 커피·점심 내기, 벌칙자와 당첨자를 간편하게 정하세요.',
    canonical: 'https://whoscoffee.site/roulette',
    heading: '랜덤 룰렛 돌리기',
  },
  {
    path: 'ladder/index.html',
    title: "온라인 사다리타기 - 커피·점심 내기 | Who's Buying Coffee?",
    description: '참가자 이름을 입력하고 온라인 사다리타기로 커피 내기, 점심 내기와 벌칙자를 간편하게 정하세요.',
    canonical: 'https://whoscoffee.site/ladder',
    heading: '온라인 사다리타기',
  },
]

function attribute(tag, name) {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1]
}

function tagWithAttribute(html, tagName, attributeName, value) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'g')) ?? []
  return tags.find((tag) => attribute(tag, attributeName) === value)
}

function elementText(html, tagName) {
  return new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`).exec(html)?.[1].trim()
}

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

    for (const page of builtPages) {
      const outputPath = resolve(outDir, page.path)
      expect(existsSync(outputPath)).toBe(true)
      const html = readFileSync(outputPath, 'utf8')
      expect(elementText(html, 'title')).toBe(page.title)
      expect(attribute(tagWithAttribute(html, 'meta', 'name', 'description') ?? '', 'content')).toBe(page.description)
      expect(attribute(tagWithAttribute(html, 'link', 'rel', 'canonical') ?? '', 'href')).toBe(page.canonical)
      expect(elementText(html, 'h1')).toBe(page.heading)
      expect(attribute(tagWithAttribute(html, 'meta', 'property', 'og:url') ?? '', 'content')).toBe(page.canonical)
    }
  })

  it('does not fall back every unknown path to the homepage', () => {
    const wrangler = JSON.parse(readFileSync(resolve(root, 'wrangler.jsonc'), 'utf8'))
    expect(wrangler.assets.not_found_handling).toBeUndefined()
  })
})
