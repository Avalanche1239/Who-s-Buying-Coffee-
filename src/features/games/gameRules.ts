import type { Participant } from '../../types/participant'
import { chooseOne, secureInt, secureShuffle, type RandomSource } from '../../lib/secureRandom'

export type GameId = 'roulette' | 'receipt' | 'overflow' | 'ladder' | 'stop'

export const STOP_TARGET_SECONDS = 7

export interface StopAttemptRecord {
  participantId: string
  elapsedMs: number
}

export interface GameResult {
  gameId: GameId
  payerId: string
  participantCount: number
  drawnAt: string
  stopAttempts?: StopAttemptRecord[]
}

function result(gameId: GameId, payerId: string, participantCount: number): GameResult {
  return { gameId, payerId, participantCount, drawnAt: new Date().toISOString() }
}

export interface LadderRung {
  row: number
  leftLane: number
}

export interface LadderState {
  rungs: LadderRung[]
  winnerLane: number
  result: GameResult
}

export function createLadderState(participants: readonly Participant[], source?: RandomSource): LadderState {
  if (participants.length < 2) throw new RangeError('At least two participants are required')
  const laneOccupants = participants.map((participant) => participant.id)
  const adjacentPairCount = participants.length - 1
  const guaranteedLeftLanes = Array.from({ length: adjacentPairCount }, (_, leftLane) => [leftLane, leftLane]).flat()
  const rowCount = Math.max(6, participants.length * 2, guaranteedLeftLanes.length)
  const extraLeftLanes = Array.from(
    { length: rowCount - guaranteedLeftLanes.length },
    () => secureInt(adjacentPairCount, source),
  )
  const rungs = secureShuffle([...guaranteedLeftLanes, ...extraLeftLanes], source).map((leftLane, row) => ({ row, leftLane }))

  for (const { leftLane } of rungs) {
    ;[laneOccupants[leftLane], laneOccupants[leftLane + 1]] = [laneOccupants[leftLane + 1], laneOccupants[leftLane]]
  }

  const winnerLane = secureInt(participants.length, source)
  return {
    rungs,
    winnerLane,
    result: result('ladder', laneOccupants[winnerLane], participants.length),
  }
}

export function ladderEndLane(rungs: readonly LadderRung[], startLane: number): number {
  return [...rungs]
    .sort((first, second) => first.row - second.row)
    .reduce((lane, rung) => {
      if (lane === rung.leftLane) return lane + 1
      if (lane === rung.leftLane + 1) return lane - 1
      return lane
    }, startLane)
}

export function ladderRevealedEndLanes(rungs: readonly LadderRung[], startLanes: readonly number[]): Set<number> {
  return new Set(startLanes.map((startLane) => ladderEndLane(rungs, startLane)))
}

export function scoreStop(elapsedMs: number, targetMs = STOP_TARGET_SECONDS * 1000): number {
  return Math.abs(Math.max(0, elapsedMs) - targetMs)
}

export function stopGameResult(participants: readonly Participant[], errors: readonly number[], source?: RandomSource): GameResult {
  if (participants.length < 2 || participants.length !== errors.length) throw new RangeError('Every participant needs one attempt')
  const largestError = Math.max(...errors)
  const payerIndexes = errors.flatMap((error, index) => error === largestError ? [index] : [])
  const payerIndex = payerIndexes[secureInt(payerIndexes.length, source)]
  return result('stop', participants[payerIndex].id, participants.length)
}

export function rouletteResult(participants: readonly Participant[], source?: RandomSource): GameResult {
  const payer = chooseOne(participants, source)
  return result('roulette', payer.id, participants.length)
}

export interface ReceiptState {
  turnOrder: Participant[]
  bombCupId: string
  cups: string[]
  selectedCupIds: string[]
  activeTurn: number
  result?: GameResult
}

export function createReceiptState(participants: readonly Participant[], multiplier = 4, source?: RandomSource): ReceiptState {
  if (participants.length < 2) throw new RangeError('At least two participants are required')
  if (![2, 4, 6].includes(multiplier)) throw new RangeError('Multiplier must be 2, 4, or 6')
  const turnOrder = secureShuffle(participants, source)
  const cups = Array.from({ length: participants.length * multiplier }, (_, index) => `cup-${index}`)
  return {
    turnOrder,
    cups,
    bombCupId: cups[secureInt(cups.length, source)],
    selectedCupIds: [],
    activeTurn: 0,
  }
}

export function pickReceiptCup(state: ReceiptState, cupId: string): ReceiptState {
  if (state.result) throw new Error('game already finished')
  if (!state.cups.includes(cupId)) throw new Error('unknown cup')
  if (state.selectedCupIds.includes(cupId)) throw new Error('cup already selected')
  const selectedCupIds = [...state.selectedCupIds, cupId]
  const payer = state.turnOrder[state.activeTurn % state.turnOrder.length]
  if (cupId === state.bombCupId) {
    return { ...state, selectedCupIds, result: result('receipt', payer.id, state.turnOrder.length) }
  }
  return { ...state, selectedCupIds, activeTurn: state.activeTurn + 1 }
}

export interface OverflowState {
  turnOrder: Participant[]
  currentTap: number
  overflowTap: number
  progressSteps: number[]
  result?: GameResult
}

function createProgressSteps(lastSafeTap: number, target: number, source?: RandomSource): number[] {
  const weights = Array.from({ length: lastSafeTap }, () => 50 + secureInt(101, source))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const steps = [0]
  let cumulativeWeight = 0
  let previous = 0

  weights.forEach((weight, index) => {
    cumulativeWeight += weight
    const remainingSteps = lastSafeTap - index - 1
    const weightedProgress = Math.round(target * cumulativeWeight / totalWeight)
    const progress = Math.min(target - remainingSteps, Math.max(previous + 1, weightedProgress))
    steps.push(progress)
    previous = progress
  })

  return steps
}

export function createOverflowState(participants: readonly Participant[], source?: RandomSource): OverflowState {
  if (participants.length < 2) throw new RangeError('At least two participants are required')
  const turnOrder = secureShuffle(participants, source)
  const firstPossibleTap = participants.length * 2 + 1
  const possibleTaps = participants.length * 2
  const overflowTap = firstPossibleTap + secureInt(possibleTaps, source)
  const finalSafeProgress = 88 + secureInt(7, source)
  return {
    turnOrder,
    currentTap: 0,
    overflowTap,
    progressSteps: createProgressSteps(overflowTap - 1, finalSafeProgress, source),
  }
}

export function overflowProgress(state: OverflowState): number {
  if (state.result || state.currentTap >= state.overflowTap) return 100
  return state.progressSteps[Math.min(state.currentTap, state.progressSteps.length - 1)]
}

export function advanceOverflow(state: OverflowState): OverflowState {
  if (state.result) throw new Error('game already finished')
  const currentTap = state.currentTap + 1
  if (currentTap === state.overflowTap) {
    const payer = state.turnOrder[(currentTap - 1) % state.turnOrder.length]
    return { ...state, currentTap, result: result('overflow', payer.id, state.turnOrder.length) }
  }
  return { ...state, currentTap }
}
