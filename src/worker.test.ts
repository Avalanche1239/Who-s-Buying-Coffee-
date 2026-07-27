import { describe, expect, it } from 'vitest'
import worker, { type Env } from './worker'

function assetEnvironment(requestedPathnames: string[]): Env {
  return {
    ASSETS: {
      async fetch(request: Request) {
        requestedPathnames.push(new URL(request.url).pathname)
        return new Response('game entry')
      },
    },
  }
}

describe('route worker', () => {
  it.each([
    ['/roulette', '/roulette/'],
    ['/ladder', '/ladder/'],
  ])('serves %s from its directory entry without redirecting', async (pathname, assetPathname) => {
    const requestedPathnames: string[] = []
    const response = await worker.fetch(
      new Request(`https://whoscoffee.site${pathname}`),
      assetEnvironment(requestedPathnames),
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('game entry')
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
