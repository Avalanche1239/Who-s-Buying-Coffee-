import { describe, expect, it } from 'vitest'
import { gameForPathname, pathnameForGame } from './gameRoutes'

describe('game routes', () => {
  it.each([
    ['/', null],
    ['/roulette', 'roulette'],
    ['/roulette/', 'roulette'],
    ['/ladder', 'ladder'],
    ['/ladder/', 'ladder'],
    ['/unknown', null],
    ['/roulette/extra', null],
  ] as const)('maps pathname %s to %s', (pathname, gameId) => {
    expect(gameForPathname(pathname)).toBe(gameId)
  })

  it.each([
    ['roulette', '/roulette'],
    ['ladder', '/ladder'],
    ['receipt', '/'],
    ['overflow', '/'],
    ['stop', '/'],
  ] as const)('maps game %s to pathname %s', (gameId, pathname) => {
    expect(pathnameForGame(gameId)).toBe(pathname)
  })
})
