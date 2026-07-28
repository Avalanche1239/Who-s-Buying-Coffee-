import { describe, expect, it } from 'vitest'
import rouletteHtml from '../roulette/index.html?raw'
import ladderHtml from '../ladder/index.html?raw'
import worker, { type Env } from './worker'

function assetEnvironment(requestedPathnames: string[]): Env {
  return {
    ASSETS: {
      async fetch(request: Request) {
        const pathname = new URL(request.url).pathname
        requestedPathnames.push(pathname)
        return new Response(pathname === '/roulette/' ? rouletteHtml : ladderHtml)
      },
    },
  }
}

describe('route worker', () => {
  it.each([
    ['/roulette', '/roulette/', "랜덤 룰렛 돌리기 - 이름 추첨·벌칙자 정하기 | Who's Buying Coffee?", '랜덤 룰렛 돌리기'],
    ['/ladder', '/ladder/', "온라인 사다리타기 - 커피·점심 내기 | Who's Buying Coffee?", '온라인 사다리타기'],
  ])('serves %s from its page-specific directory entry without redirecting', async (pathname, assetPathname, title, heading) => {
    const requestedPathnames: string[] = []
    const response = await worker.fetch(
      new Request(`https://whoscoffee.site${pathname}`),
      assetEnvironment(requestedPathnames),
    )

    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain(`<title>${title}</title>`)
    expect(html).toContain(`<h1 id="static-page-title">${heading}</h1>`)
    expect(requestedPathnames).toEqual([assetPathname])
  })

  it('returns 404 for an unknown path that reaches the worker', async () => {
    const requestedPathnames: string[] = []
    const response = await worker.fetch(
      new Request('https://whoscoffee.site/unknown'),
      assetEnvironment(requestedPathnames),
    )

    expect(response.status).toBe(404)
    expect(requestedPathnames).toEqual([])
  })
})
