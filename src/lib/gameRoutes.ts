import type { GameId } from '../features/games/gameRules'

export type RoutedGameId = Extract<GameId, 'roulette' | 'ladder'>

export function gameForPathname(pathname: string): RoutedGameId | null {
  const normalizedPathname = pathname.length > 1
    ? pathname.replace(/\/$/, '')
    : pathname

  if (normalizedPathname === '/roulette') return 'roulette'
  if (normalizedPathname === '/ladder') return 'ladder'
  return null
}

export function pathnameForGame(gameId: GameId): string {
  if (gameId === 'roulette') return '/roulette'
  if (gameId === 'ladder') return '/ladder'
  return '/'
}
