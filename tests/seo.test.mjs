import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')

describe('search engine metadata', () => {
  it('declares the canonical URL and share metadata', () => {
    const html = read('index.html')

    expect(html).toContain('<link rel="canonical" href="https://whoscoffee.site/" />')
    expect(html).toContain('<meta property="og:url" content="https://whoscoffee.site/" />')
    expect(html).toContain('<meta property="og:locale" content="ko_KR" />')
    expect(html).toContain('<script type="application/ld+json">')
  })

  it('allows search crawling and advertises the sitemap', () => {
    const robots = read('public/robots.txt')

    expect(robots).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://whoscoffee.site/sitemap.xml\n',
    )
  })

  it('lists the canonical homepage in the sitemap', () => {
    const sitemap = read('public/sitemap.xml')

    expect(sitemap).toContain('<loc>https://whoscoffee.site/</loc>')
    expect(sitemap).not.toContain('<priority>')
    expect(sitemap).not.toContain('<changefreq>')
  })
})
