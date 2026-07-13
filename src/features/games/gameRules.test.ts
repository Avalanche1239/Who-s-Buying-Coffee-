import { describe, expect, it } from 'vitest'
import type { Participant } from '../../types/participant'
import type { RandomSource } from '../../lib/secureRandom'
import {
  advanceOverflow,
  createLadderState,
  createOverflowState,
  createReceiptState,
  ladderEndLane,
  ladderRevealedEndLanes,
  overflowProgress,
  pickReceiptCup,
  rouletteResult,
  scoreStop,
  stopGameResult,
} from './gameRules'

const players: Participant[] = [
  { id: 'p1', name: 'Mina' },
  { id: 'p2', name: 'Joon' },
]

const fourPlayers: Participant[] = [
  ...players,
  { id: 'p3', name: 'Ara' },
  { id: 'p4', name: 'Noah' },
]

function constant(value: number): RandomSource {
  return (target) => {
    target[0] = value
    return target
  }
}

function cycling(...values: number[]): RandomSource {
  let index = 0
  return (target) => {
    for (let byte = 0; byte < target.length; byte += 1) {
      target[byte] = values[index % values.length]
      index += 1
    }
    return target
  }
}

describe('game rules', () => {
  it('creates a roulette result before presentation', () => {
    expect(rouletteResult(players, constant(1)).payerId).toBe('p2')
  })

  it('reveals a receipt payer and prevents duplicate cup picks', () => {
    const state = createReceiptState(players, 2, constant(0))
    expect(state.cups).toHaveLength(4)
    const safe = pickReceiptCup(state, 'cup-1')
    expect(safe.result).toBeUndefined()
    expect(() => pickReceiptCup(safe, 'cup-1')).toThrow('already selected')
    const result = pickReceiptCup(safe, 'cup-0')
    expect(result.result?.payerId).toBe(result.turnOrder[1].id)
  })

  it('overflows only after everyone has played once', () => {
    let state = createOverflowState(players, constant(0))
    expect(state.overflowTap).toBe(5)
    expect(overflowProgress(state)).toBe(0)
    state = advanceOverflow(state)
    state = advanceOverflow(state)
    state = advanceOverflow(state)
    state = advanceOverflow(state)
    expect(state.result).toBeUndefined()
    expect(overflowProgress(state)).toBeGreaterThanOrEqual(88)
    expect(overflowProgress(state)).toBeLessThanOrEqual(95)
    state = advanceOverflow(state)
    expect(state.result?.payerId).toBe('p2')
    expect(overflowProgress(state)).toBe(100)
  })

  it('uses visibly different safe progress increments', () => {
    let state = createOverflowState(players, cycling(0, 100))
    const safeProgress = [overflowProgress(state)]

    while (!state.result) {
      state = advanceOverflow(state)
      if (!state.result) safeProgress.push(overflowProgress(state))
    }

    const increments = safeProgress.slice(1).map((value, index) => value - safeProgress[index])
    expect(Math.max(...increments) - Math.min(...increments)).toBeGreaterThanOrEqual(2)
    expect(safeProgress.at(-1)).toBeGreaterThanOrEqual(88)
    expect(safeProgress.at(-1)).toBeLessThanOrEqual(94)
  })

  it('builds a ladder that selects exactly one payer', () => {
    const state = createLadderState(fourPlayers, cycling(0, 90, 180))
    expect(state.rungs.length).toBeGreaterThanOrEqual(6)
    expect(fourPlayers.some((player) => player.id === state.result.payerId)).toBe(true)
    expect(state.result.gameId).toBe('ladder')
  })

  it('creates at least two rungs between every adjacent pair of lanes', () => {
    const state = createLadderState(fourPlayers, constant(0))
    const counts = Array.from({ length: fourPlayers.length - 1 }, (_, leftLane) =>
      state.rungs.filter((rung) => rung.leftLane === leftLane).length,
    )

    expect(counts.every((count) => count >= 2)).toBe(true)
  })

  it('traces each ladder start lane to its final lane', () => {
    const rungs = [
      { row: 0, leftLane: 0 },
      { row: 1, leftLane: 1 },
      { row: 2, leftLane: 0 },
    ]

    expect(ladderEndLane(rungs, 0)).toBe(2)
    expect(ladderEndLane(rungs, 1)).toBe(1)
  })

  it('reveals the result at the route destination instead of its starting lane', () => {
    const rungs = [{ row: 0, leftLane: 1 }]

    expect([...ladderRevealedEndLanes(rungs, [2])]).toEqual([1])
  })

  it('scores seven-second attempts by elapsed-time error and picks the farthest participant', () => {
    expect(scoreStop(6420)).toBe(580)
    expect(stopGameResult(players, [580, 3150]).payerId).toBe('p2')
  })

  it('clamps negative elapsed time before scoring a seven-second attempt', () => {
    expect(scoreStop(-500)).toBe(7000)
  })
})
