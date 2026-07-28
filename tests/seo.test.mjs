import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { build } from 'vite'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const sitemapUrls = [
  'https://whoscoffee.site/',
  'https://whoscoffee.site/roulette',
  'https://whoscoffee.site/ladder',
]
const outputDirectories = []

const pages = [
  {
    path: 'index.html',
    url: 'https://whoscoffee.site/',
    title: "커피 내기 랜덤 게임 모음 | Who's Buying Coffee?",
    description: '룰렛, 커피 뽑기, 사다리타기 등으로 점심·커피 내기와 벌칙자를 빠르고 공정하게 정하는 무료 랜덤 게임입니다.',
    heading: '커피 내기 랜덤 게임',
    intro: '이름을 입력하고 원하는 게임을 선택해 커피 내기, 점심 내기, 벌칙자와 당첨자를 간편하게 정해 보세요.',
  },
  {
    path: 'roulette/index.html',
    url: 'https://whoscoffee.site/roulette',
    title: "랜덤 룰렛 돌리기 - 이름 추첨·벌칙자 정하기 | Who's Buying Coffee?",
    description: '참가자 이름을 입력하고 랜덤 룰렛을 돌려 커피·점심 내기, 벌칙자와 당첨자를 간편하게 정하세요.',
    heading: '랜덤 룰렛 돌리기',
    intro: '참가자 이름을 입력한 뒤 룰렛을 돌려 커피 내기, 점심 내기, 벌칙자 또는 당첨자를 무작위로 선택할 수 있습니다.',
  },
  {
    path: 'ladder/index.html',
    url: 'https://whoscoffee.site/ladder',
    title: "온라인 사다리타기 - 커피·점심 내기 | Who's Buying Coffee?",
    description: '참가자 이름을 입력하고 온라인 사다리타기로 커피 내기, 점심 내기와 벌칙자를 간편하게 정하세요.',
    heading: '온라인 사다리타기',
    intro: '참가자 이름을 입력하고 사다리를 실행해 커피 내기, 점심 내기와 벌칙 결과를 무작위로 정할 수 있습니다.',
  },
]

function attribute(tag, name) {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1]
}

function tagWithAttribute(html, tagName, attributeName, value) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'g')) ?? []
  return tags.find((tag) => attribute(tag, attributeName) === value)
}

function metaContent(html, attributeName, value) {
  return attribute(tagWithAttribute(html, 'meta', attributeName, value) ?? '', 'content')
}

function linkHref(html, rel) {
  return attribute(tagWithAttribute(html, 'link', 'rel', rel) ?? '', 'href')
}

function elementTexts(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, 'g'))]
    .map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function jsonLd(html) {
  const match = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(html)
  return match ? JSON.parse(match[1]) : null
}

function parseXml(xml) {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  expect(document.querySelector('parsererror')).toBeNull()
  return document
}

afterEach(() => {
  for (const directory of outputDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('search engine metadata', () => {
  it.each(pages)('provides unique static metadata and visible content in $path', (page) => {
    const html = read(page.path)
    const title = elementTexts(html, 'title')[0]
    const description = metaContent(html, 'name', 'description')
    const headings = elementTexts(html, 'h1')

    expect(attribute(tagWithAttribute(html, 'html', 'lang', 'ko') ?? '', 'lang')).toBe('ko')
    expect(title).toBe(page.title)
    expect(description).toBe(page.description)
    expect(linkHref(html, 'canonical')).toBe(page.url)
    expect(metaContent(html, 'property', 'og:url')).toBe(page.url)
    expect(metaContent(html, 'property', 'og:title')).toBe(title)
    expect(metaContent(html, 'name', 'twitter:title')).toBe(title)
    expect(metaContent(html, 'property', 'og:description')).toBe(description)
    expect(metaContent(html, 'name', 'twitter:description')).toBe(description)
    expect(headings).toEqual([page.heading])
    expect(html).toContain(page.intro)
    expect(html).toContain('<link rel="stylesheet" href="/src/styles.css" />')
  })

  it('keeps titles, descriptions, and canonical URLs unique across pages', () => {
    const metadata = pages.map((page) => {
      const html = read(page.path)
      return {
        title: elementTexts(html, 'title')[0],
        description: metaContent(html, 'name', 'description'),
        canonical: linkHref(html, 'canonical'),
      }
    })

    expect(new Set(metadata.map(({ title }) => title)).size).toBe(pages.length)
    expect(new Set(metadata.map(({ description }) => description)).size).toBe(pages.length)
    expect(new Set(metadata.map(({ canonical }) => canonical)).size).toBe(pages.length)
  })

  it.each(pages)('uses absolute share images and valid WebApplication JSON-LD in $path', (page) => {
    const html = read(page.path)
    const openGraphImage = metaContent(html, 'property', 'og:image')
    const twitterImage = metaContent(html, 'name', 'twitter:image')
    const structuredData = jsonLd(html)

    expect(openGraphImage).toMatch(/^https:\/\/whoscoffee\.site\//)
    expect(twitterImage).toMatch(/^https:\/\/whoscoffee\.site\//)
    expect(structuredData).toMatchObject({
      '@type': 'WebApplication',
      url: 'https://whoscoffee.site/',
    })
    expect(linkHref(html, 'canonical')).not.toContain('www.')
    expect(metaContent(html, 'property', 'og:url')).not.toContain('www.')
    expect(structuredData.url).not.toContain('www.')
  })

  it('allows all crawlers and advertises the canonical sitemap without blocking public pages', () => {
    const robots = read('public/robots.txt').replaceAll('\r\n', '\n')

    expect(robots).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://whoscoffee.site/sitemap.xml\n',
    )
    expect(robots).not.toMatch(/User-agent:\s*Googlebot[\s\S]*Disallow:/i)
    expect(robots).not.toMatch(/Disallow:\s*\/(?:roulette|ladder)(?:\/|\s|$)/i)
  })

  it('lists exactly the three canonical crawlable URLs in valid XML', () => {
    const sitemap = read('public/sitemap.xml')
    const document = parseXml(sitemap)
    const locations = [...document.querySelectorAll('url > loc')].map(
      (element) => element.textContent?.trim(),
    )

    expect(locations).toEqual(sitemapUrls)
    expect(new Set(locations).size).toBe(3)
    expect(locations.every((url) => url?.startsWith('https://whoscoffee.site'))).toBe(true)
    expect(locations.some((url) => url?.includes('www.'))).toBe(false)
    expect(locations.some((url) => url?.startsWith('http://'))).toBe(false)
    expect(document.querySelector('priority')).toBeNull()
    expect(document.querySelector('changefreq')).toBeNull()
    expect(document.querySelector('lastmod')).toBeNull()
  })

  it('copies robots and sitemap unchanged into the production build', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whos-coffee-seo-'))
    outputDirectories.push(outDir)

    await build({
      configFile: resolve(root, 'vite.config.ts'),
      build: { outDir },
      logLevel: 'silent',
    })

    for (const filename of ['robots.txt', 'sitemap.xml']) {
      const outputPath = resolve(outDir, filename)
      expect(existsSync(outputPath)).toBe(true)
      expect(readFileSync(outputPath, 'utf8')).toBe(read(`public/${filename}`))
    }
  })
})
