import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Participant } from '../../types/participant'
import {
  createLadderState,
  ladderEndLane,
  ladderRevealedEndLanes,
  scoreStop,
  STOP_TARGET_SECONDS,
  stopGameResult,
  type GameResult,
  type LadderState,
} from './gameRules'

interface GameProps {
  participants: Participant[]
  onFinish: (result: GameResult, delay: number) => void
  labelFor: (participant: Participant) => string
}

interface LadderGameProps extends Omit<GameProps, 'onFinish'> {}

export function LadderGame({ participants, labelFor }: LadderGameProps) {
  const [ladder, setLadder] = useState<LadderState>()
  const [activeLane, setActiveLane] = useState<number>()
  const [instantLane, setInstantLane] = useState<number>()
  const [revealedLanes, setRevealedLanes] = useState<Set<number>>(new Set())
  const routeTimer = useRef<number | undefined>(undefined)
  const routeRef = useRef<SVGSVGElement>(null)
  const boardStyle = { '--lane-count': participants.length } as CSSProperties
  const revealedEndLanes = ladder ? ladderRevealedEndLanes(ladder.rungs, [...revealedLanes]) : new Set<number>()
  const displayedLane = activeLane ?? instantLane
  const displayedRoute = ladder && displayedLane !== undefined
    ? ladderRouteGeometry(ladder, displayedLane, participants.length)
    : undefined

  useEffect(() => () => window.clearTimeout(routeTimer.current), [])

  function finishRoute(lane: number) {
    window.clearTimeout(routeTimer.current)
    setRevealedLanes((current) => new Set(current).add(lane))
    setActiveLane(undefined)
  }

  function revealRoute(lane: number) {
    if (!ladder || activeLane !== undefined || instantLane !== undefined || revealedLanes.has(lane)) return
    setActiveLane(lane)
    routeTimer.current = window.setTimeout(() => finishRoute(lane), 2200)
  }

  function revealWinner() {
    if (!ladder || activeLane !== undefined || instantLane !== undefined) return
    const winnerStartLane = participants.findIndex((_, lane) => ladderEndLane(ladder.rungs, lane) === ladder.winnerLane)
    setInstantLane(winnerStartLane)
    setRevealedLanes(new Set(participants.map((_, lane) => lane)))
  }

  function createNewLadder() {
    window.clearTimeout(routeTimer.current)
    setLadder(createLadderState(participants))
    setActiveLane(undefined)
    setInstantLane(undefined)
    setRevealedLanes(new Set())
  }

  useEffect(() => {
    const route = routeRef.current
    if (!route || activeLane === undefined) return
    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName === 'route-trace') finishRoute(activeLane)
    }
    route.addEventListener('animationend', handleAnimationEnd)
    return () => route.removeEventListener('animationend', handleAnimationEnd)
  }, [activeLane])

  function outcomeFor(lane: number) {
    if (!ladder) return ''
    return ladderEndLane(ladder.rungs, lane) === ladder.winnerLane ? '당첨' : '통과'
  }

  return <>
    <div className="ladder-scroll">
      <div className={`ladder-board ${ladder ? 'ready' : ''}`} aria-label="사다리" style={boardStyle}>
        {participants.map((participant, lane) => <div className="ladder-lane" key={participant.id} style={{ left: `${(lane + .5) * 100 / participants.length}%` }}>
          <button
            aria-label={`${lane + 1}번 사다리 경로 보기`}
            className="ladder-start-button"
            disabled={!ladder || activeLane !== undefined || instantLane !== undefined || revealedLanes.has(lane)}
            title={`${labelFor(participant)} · ${lane + 1}번 경로 보기`}
            type="button"
            onClick={() => revealRoute(lane)}
          >{labelFor(participant)}</button>
          <i />
          <b className={revealedEndLanes.has(lane) ? (lane === ladder?.winnerLane ? 'winner' : 'safe') : ''}>
            {revealedEndLanes.has(lane) ? (lane === ladder?.winnerLane ? '당첨' : '통과') : ''}
          </b>
        </div>)}
        {ladder?.rungs.map((rung) => <i className="ladder-rung" key={`${rung.row}-${rung.leftLane}`} style={{
          left: `${(rung.leftLane + .5) * 100 / participants.length}%`,
          top: `${18 + rung.row * 66 / ladder.rungs.length}%`,
          width: `${100 / participants.length}%`,
        }} />)}
        {displayedRoute && <svg ref={routeRef} className={`ladder-route ${instantLane !== undefined ? 'instant' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            key={displayedLane}
            points={displayedRoute.points}
            style={{ '--route-length': `${displayedRoute.length}` } as CSSProperties}
            ref={(line) => {
              const bounds = line?.ownerSVGElement?.getBoundingClientRect()
              if (!line || !bounds || bounds.width <= 0 || bounds.height <= 0) return
              line.style.setProperty('--route-length', `${routeLengthForViewport(displayedRoute.coordinates, bounds.width, bounds.height)}px`)
            }}
          />
        </svg>}
      </div>
    </div>

    {!ladder ? <button className="start-button compact" type="button" onClick={createNewLadder}>사다리 만들기</button> : <>
      <div className="ladder-route-buttons" aria-label="경로 선택">
        {participants.map((participant, lane) => <button
          aria-label={`${lane + 1}번 경로 보기`}
          className={revealedLanes.has(lane) ? 'revealed' : ''}
          disabled={activeLane !== undefined || instantLane !== undefined || revealedLanes.has(lane)}
          key={participant.id}
          type="button"
          onClick={() => revealRoute(lane)}
        ><strong>{lane + 1}번</strong><small>{labelFor(participant)}</small></button>)}
      </div>
      <div className="ladder-action-buttons">
        <button className="secondary-button reveal-all" disabled={activeLane !== undefined || instantLane !== undefined} type="button" onClick={revealWinner}>바로 공개</button>
        <button className="secondary-button" type="button" onClick={createNewLadder}>다시 하기</button>
      </div>
    </>}

    {activeLane !== undefined && <p className="event-text" aria-live="polite">{activeLane + 1}번 경로를 따라 내려가는 중…</p>}
    {activeLane === undefined && revealedLanes.size > 0 && <p className="event-text" role="status">
      {revealedLanes.size === participants.length ? '모든 결과를 공개했어요.' : `${[...revealedLanes].at(-1)! + 1}번은 ${outcomeFor([...revealedLanes].at(-1)!)}!`}
    </p>}
  </>
}

interface StopAttempt {
  elapsedMs: number
  errorMs: number
}

export function StopGame({ participants, onFinish, labelFor }: GameProps) {
  const [running, setRunning] = useState(false)
  const [attempts, setAttempts] = useState<StopAttempt[]>([])
  const [lastAttempt, setLastAttempt] = useState<StopAttempt>()
  const [finishing, setFinishing] = useState(false)
  const startedAt = useRef(0)
  const current = participants[attempts.length]

  function stop() {
    const elapsedMs = Math.max(0, performance.now() - startedAt.current)
    const attempt = { elapsedMs, errorMs: scoreStop(elapsedMs) }
    const nextAttempts = [...attempts, attempt]
    setAttempts(nextAttempts)
    setLastAttempt(attempt)
    setRunning(false)
    if (nextAttempts.length === participants.length) {
      setFinishing(true)
      const result = stopGameResult(participants, nextAttempts.map((item) => item.errorMs))
      onFinish({
        ...result,
        stopAttempts: nextAttempts.map((item, index) => ({
          participantId: participants[index].id,
          elapsedMs: item.elapsedMs,
        })),
      }, 1800)
    }
  }

  return <>
    <div className={`time-sense-stage ${running ? 'running' : ''}`} aria-label={`${STOP_TARGET_SECONDS}초 감각 게임`}>
      <img alt="" height={512} src="/assets/game-stop-web.png" width={512} />
      <div className="time-sense-face" aria-hidden="true">
        {running ? <><i /><strong>감으로 세어 보세요</strong><small>숫자는 보이지 않아요</small></> : <><strong>{STOP_TARGET_SECONDS.toFixed(2)}</strong><small>목표 시간</small></>}
      </div>
    </div>
    <p className="turn-callout">{current ? <><strong className="turn-name">{labelFor(current)}</strong>님 차례</> : '모든 도전이 끝났어요'}</p>
    {lastAttempt && <p className="attempt-result" role="status"><strong>{formatSeconds(lastAttempt.elapsedMs)}초</strong>{` · ${STOP_TARGET_SECONDS}초와 ${formatSeconds(lastAttempt.errorMs)}초 차이`}</p>}
    {attempts.length > 0 && <div className="score-chips">{attempts.map((attempt, index) => <span key={participants[index].id}>{labelFor(participants[index])} · {formatSeconds(attempt.elapsedMs)}초</span>)}</div>}
    <button className={`start-button compact ${running ? 'now-button' : ''}`} disabled={!current || finishing} type="button" onClick={() => {
      if (running) stop()
      else {
        setLastAttempt(undefined)
        startedAt.current = performance.now()
        setRunning(true)
      }
    }}>{finishing ? '결과 확인 중…' : running ? '지금!' : '도전 시작'}</button>
  </>
}

function ladderRouteGeometry(ladder: LadderState, startLane: number, laneCount: number): { points: string, coordinates: Array<[number, number]>, length: number } {
  let lane = startLane
  const points: Array<[number, number]> = [[laneCenter(lane, laneCount), 14]]
  const rungs = [...ladder.rungs].sort((first, second) => first.row - second.row)
  rungs.forEach((rung) => {
    const y = 18 + rung.row * 66 / ladder.rungs.length
    if (lane !== rung.leftLane && lane !== rung.leftLane + 1) return
    points.push([laneCenter(lane, laneCount), y])
    lane += lane === rung.leftLane ? 1 : -1
    points.push([laneCenter(lane, laneCount), y])
  })
  points.push([laneCenter(lane, laneCount), 88])
  const length = points.slice(1).reduce((total, [x, y], index) => {
    const [previousX, previousY] = points[index]
    return total + Math.hypot(x - previousX, y - previousY)
  }, 0)
  return { points: points.map(([x, y]) => `${x},${y}`).join(' '), coordinates: points, length }
}

export function routeLengthForViewport(points: ReadonlyArray<readonly [number, number]>, width: number, height: number): number {
  const scaleX = width / 100
  const scaleY = height / 100
  return points.slice(1).reduce((total, [x, y], index) => {
    const [previousX, previousY] = points[index]
    return total + Math.hypot((x - previousX) * scaleX, (y - previousY) * scaleY)
  }, 0)
}

function laneCenter(lane: number, laneCount: number): number {
  return (lane + .5) * 100 / laneCount
}

function formatSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(2)
}
