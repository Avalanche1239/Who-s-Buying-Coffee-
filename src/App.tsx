import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { validateParticipantNames, type ValidationErrorCode } from './features/participants/validateParticipants'
import {
  advanceOverflow,
  createOverflowState,
  createReceiptState,
  overflowProgress,
  pickReceiptCup,
  rouletteResult,
  STOP_TARGET_SECONDS,
  type GameId,
  type GameResult,
  type OverflowState,
  type ReceiptState,
} from './features/games/gameRules'
import type { Participant } from './types/participant'
import { LadderGame, StopGame } from './features/games/NewGameScreens'
import { gameForPathname, pathnameForGame } from './lib/gameRoutes'

type Screen = 'setup' | 'games' | GameId | 'result'

const validationMessages: Record<ValidationErrorCode, string> = {
  'too-few': '두 명 이상의 이름을 입력해 주세요.',
  'too-many': '참가자는 최대 12명까지 가능해요.',
  'blank-name': '모든 참가자의 이름을 입력해 주세요.',
  'name-too-long': '이름은 20자 이하로 입력해 주세요.',
}

const gameNames: Record<GameId, string> = {
  roulette: '룰렛',
  receipt: '커피 뽑기',
  overflow: '아슬아슬 커피',
  ladder: '사다리타기',
  stop: '정확히 멈추기',
}

const setupPageContent = {
  home: {
    heading: '커피 내기 랜덤 게임',
    description: '이름을 입력하고 원하는 게임을 선택해 커피 내기, 점심 내기, 벌칙자와 당첨자를 간편하게 정해 보세요.',
  },
  roulette: {
    heading: '랜덤 룰렛 돌리기',
    description: '참가자 이름을 입력한 뒤 룰렛을 돌려 커피 내기, 점심 내기, 벌칙자 또는 당첨자를 무작위로 선택할 수 있습니다.',
  },
  ladder: {
    heading: '온라인 사다리타기',
    description: '참가자 이름을 입력하고 사다리를 실행해 커피 내기, 점심 내기와 벌칙 결과를 무작위로 정할 수 있습니다.',
  },
} as const

const takeawayCup = '/assets/takeaway-cup-web.png'
const takeawayWinner = '/assets/takeaway-win-web.png'
const takeawayOverflow = '/assets/takeaway-overflow-web.png'
const takeawayCutaway = '/assets/takeaway-cutaway-web.png'
const ladderArt = '/assets/game-ladder-web.png'
const stopArt = '/assets/game-stop-web.png'
const gameArt: Record<GameId, string> = {
  roulette: takeawayCup,
  receipt: takeawayWinner,
  overflow: takeawayOverflow,
  ladder: ladderArt,
  stop: stopArt,
}

export default function App() {
  const initialRoutedGame = gameForPathname(window.location.pathname)
  const setupContent = setupPageContent[initialRoutedGame ?? 'home']
  const [names, setNames] = useState(['', ''])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [screen, setScreen] = useState<Screen>('setup')
  const [activeGame, setActiveGame] = useState<GameId>(initialRoutedGame ?? 'roulette')
  const [receipt, setReceipt] = useState<ReceiptState>()
  const [overflow, setOverflow] = useState<OverflowState>()
  const [gameResult, setGameResult] = useState<GameResult>()
  const [rouletteRotation, setRouletteRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [receiptReveal, setReceiptReveal] = useState<GameResult>()
  const [overflowReveal, setOverflowReveal] = useState<GameResult>()
  const [error, setError] = useState('')
  const resultTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    if (resultTimer.current !== undefined) window.clearTimeout(resultTimer.current)
  }, [])

  useEffect(() => {
    function handlePopState() {
      const routedGame = gameForPathname(window.location.pathname)
      cancelPendingResult()
      setGameResult(undefined)
      setRouletteRotation(0)

      if (routedGame) {
        setActiveGame(routedGame)
        setScreen(participants.length > 0 ? routedGame : 'setup')
        return
      }

      setScreen(participants.length > 0 ? 'games' : 'setup')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [participants])

  function cancelPendingResult() {
    if (resultTimer.current !== undefined) {
      window.clearTimeout(resultTimer.current)
      resultTimer.current = undefined
    }
    setSpinning(false)
    setReceiptReveal(undefined)
    setOverflowReveal(undefined)
  }

  function scheduleFinish(result: GameResult, delay: number) {
    resultTimer.current = window.setTimeout(() => {
      resultTimer.current = undefined
      finish(result)
    }, revealDelay(delay))
  }

  function leaveGame() {
    cancelPendingResult()
    pushPathname('/')
    setScreen('games')
  }

  function updateName(index: number, value: string) {
    setNames((current) => current.map((name, itemIndex) => (itemIndex === index ? value : name)))
    setError('')
  }

  function startGames(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validated = validateParticipantNames(names)
    if (!validated.ok) {
      setError(validationMessages[validated.code])
      return
    }
    setParticipants(validated.participants)
    setError('')
    const routedGame = gameForPathname(window.location.pathname)
    if (routedGame) {
      setActiveGame(routedGame)
      setScreen(routedGame)
    } else {
      setScreen('games')
    }
  }

  function openGame(gameId: GameId) {
    cancelPendingResult()
    setActiveGame(gameId)
    setGameResult(undefined)
    setRouletteRotation(0)
    setReceiptReveal(undefined)
    setOverflowReveal(undefined)
    if (gameId === 'receipt') setReceipt(undefined)
    if (gameId === 'overflow') setOverflow(createOverflowState(participants))
    pushPathname(pathnameForGame(gameId))
    setScreen(gameId)
  }

  function showGameSelection() {
    pushPathname('/')
    setScreen('games')
  }

  function showSetup() {
    pushPathname('/')
    setScreen('setup')
  }

  function finish(result: GameResult) {
    setGameResult(result)
    setScreen('result')
  }

  if (screen === 'result' && gameResult) {
    const payer = participants.find((participant) => participant.id === gameResult.payerId)
    return (
      <main className="shell game-shell">
        <section className="play-panel result-panel">
          <p className="eyebrow">RESULT · {gameNames[gameResult.gameId]}</p>
          <div className="result-mark" aria-hidden="true">!</div>
          <h1 className="play-title">오늘의 결제자는</h1>
          <p className="payer-name">{payer ? participantLabel(payer, participants) : ''}</p>
          <p className="fairness">{resultExplanation(gameResult)}</p>
          {gameResult.gameId === 'stop' && gameResult.stopAttempts && <div className="result-attempts" aria-label="전체 참가자 기록">
            <small>전체 기록</small>
            <div className="score-chips">
              {gameResult.stopAttempts.map((attempt) => {
                const participant = participants.find((item) => item.id === attempt.participantId)
                return <span key={attempt.participantId}>{participant ? participantLabel(participant, participants) : ''} · {formatSeconds(attempt.elapsedMs)}초</span>
              })}
            </div>
          </div>}
          <div className="action-row">
            <button className="start-button compact" type="button" onClick={() => openGame(activeGame)}>같은 게임 다시 하기</button>
            <button className="secondary-button" type="button" onClick={showGameSelection}>다른 게임 선택</button>
            <button className="back-button" type="button" onClick={showSetup}>처음으로</button>
          </div>
        </section>
      </main>
    )
  }

  if (screen === 'roulette') {
    const wheelStyle = {
      background: rouletteGradient(participants.length),
      transform: `rotate(${rouletteRotation}deg)`,
    } as CSSProperties
    return <GameLayout title="룰렛" description="버튼을 누르면 결제할 한 사람을 공정하게 뽑아요." onBack={leaveGame}>
      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden="true" />
        <div className={`roulette-wheel ${spinning ? 'spinning' : ''}`} style={wheelStyle}>
          {participants.map((player, index) => <span className="wheel-label" key={player.id} style={{ transform: `rotate(${index * 360 / participants.length + 360 / participants.length / 2}deg) translateY(-104px) rotate(${-index * 360 / participants.length - 360 / participants.length / 2}deg)` }}>{participantLabel(player, participants)}</span>)}
        </div>
      </div>
      <div className="participant-chips">{participants.map((player) => <span key={player.id}>{participantLabel(player, participants)}</span>)}</div>
      {spinning && <p className="event-text" role="status">룰렛이 돌아가고 있어요…</p>}
      <button className="start-button compact" disabled={spinning} type="button" onClick={() => {
        const pending = rouletteResult(participants)
        const winnerIndex = participants.findIndex((player) => player.id === pending.payerId)
        setSpinning(true)
        setRouletteRotation(360 * 6 + 360 - (winnerIndex + 0.5) * 360 / participants.length)
        scheduleFinish(pending, 3200)
      }}>{spinning ? '회전 중…' : '룰렛 돌리기'}</button>
    </GameLayout>
  }

  if (screen === 'receipt' && !receipt) {
    return <GameLayout title="커피 뽑기" description="얼마나 길게 즐길지 선택하세요." onBack={leaveGame}>
      <div className="preset-grid">
        <PresetButton label="빠르게" detail={`${participants.length * 2}잔`} onClick={() => setReceipt(createReceiptState(participants, 2))} />
        <PresetButton label="쫄깃하게" detail={`${participants.length * 4}잔 · 추천`} featured onClick={() => setReceipt(createReceiptState(participants, 4))} />
        <PresetButton label="오래 즐기기" detail={`${participants.length * 6}잔`} onClick={() => setReceipt(createReceiptState(participants, 6))} />
      </div>
    </GameLayout>
  }

  if (screen === 'receipt' && receipt) {
    const currentPlayer = receipt.turnOrder[receipt.activeTurn % receipt.turnOrder.length]
    return <GameLayout shellClassName="receipt-shell" panelClassName="receipt-panel" title="커피 뽑기" description={<><strong className="turn-name">{participantLabel(currentPlayer, participants)}</strong>님, 테이크아웃 커피 하나를 선택하세요.</>} onBack={leaveGame}>
      <div className={`cup-grid ${receiptReveal ? 'revealing' : ''}`}>
        {receipt.cups.map((cupId, index) => {
          const selected = receipt.selectedCupIds.includes(cupId)
          return <button
            aria-label={`${index + 1}번 커피잔 선택`}
            className={`pick-cup ${selected ? 'picked' : ''} ${receiptReveal && cupId === receipt.bombCupId ? 'winner' : ''}`}
            disabled={selected || Boolean(receiptReveal)}
            key={cupId}
            type="button"
            onClick={() => {
              const next = pickReceiptCup(receipt, cupId)
              setReceipt(next)
              if (next.result) {
                setReceiptReveal(next.result)
                scheduleFinish(next.result!, 1600)
              }
            }}
          ><img alt="" height={512} src={receiptReveal && cupId === receipt.bombCupId ? takeawayWinner : takeawayCup} width={512} /><span aria-hidden="true">{receiptReveal && cupId === receipt.bombCupId ? '당첨!' : selected ? '통과' : '?'}</span></button>
        })}
      </div>
      {receiptReveal && <div className="event-overlay" role="status"><img alt="" className="win-event-art" height={512} src={takeawayWinner} width={512} /><strong>당첨!</strong></div>}
    </GameLayout>
  }

  if (screen === 'overflow' && overflow) {
    const currentPlayer = overflow.turnOrder[overflow.currentTap % overflow.turnOrder.length]
    const level = overflowProgress(overflow)
    return <GameLayout title="아슬아슬 커피" description={<><strong className="turn-name">{participantLabel(currentPlayer, participants)}</strong>님 차례예요. 넘치기 전에 다음 사람에게 넘기세요.</>} onBack={leaveGame}>
      <div className="overflow-scene">
        <div className="fill-visual" aria-label={`커피 게이지 ${level}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level}>
          {overflowReveal ? <img alt="" className="takeaway-stage spilling" height={512} src={takeawayOverflow} width={512} /> : <div className="cutaway-cup">
            <div className="coffee-cavity" aria-hidden="true">
              <span className={level === 0 ? 'coffee-fill empty' : 'coffee-fill'} style={{ height: `${level}%` }} />
            </div>
            <img alt="" className="cutaway-frame" height={512} src={takeawayCutaway} width={512} />
          </div>}
        </div>
        <strong className="fill-percentage">{level}%</strong>
      </div>
      {overflowReveal && <p className="event-text danger" role="status">앗, 커피가 넘쳤다!</p>}
      <button className="start-button compact" disabled={Boolean(overflowReveal)} type="button" onClick={() => {
        const next = advanceOverflow(overflow)
        setOverflow(next)
        if (next.result) {
          setOverflowReveal(next.result)
          scheduleFinish(next.result!, 1400)
        }
      }}>다음 사람에게 넘기기</button>
    </GameLayout>
  }

  if (screen === 'ladder') {
    return <GameLayout title="사다리타기" description="번호를 눌러 경로를 따라가고, 끝에서 통과인지 당첨인지 확인하세요." onBack={leaveGame}>
      <LadderGame participants={participants} labelFor={(participant) => participantLabel(participant, participants)} />
    </GameLayout>
  }

  if (screen === 'stop') {
    return <GameLayout title="정확히 멈추기" description={`화면을 보지 않고 마음속으로 ${STOP_TARGET_SECONDS}초를 세세요. ${STOP_TARGET_SECONDS}초에서 가장 멀어진 사람이 당첨돼요.`} onBack={leaveGame}>
      <StopGame participants={participants} labelFor={(participant) => participantLabel(participant, participants)} onFinish={scheduleFinish} />
    </GameLayout>
  }

  if (screen === 'games') {
    return (
      <main className="shell">
        <section className="intro" aria-labelledby="game-title">
          <p className="eyebrow">STEP 02</p>
          <h1 id="game-title" className="game-title">게임을 선택하세요</h1>
          <p className="lead">오늘의 커피 내기를 어떤 방식으로 정할까요?</p>
        </section>
        <section className="game-grid" aria-label="게임 목록">
          <GameCard id="roulette" title="룰렛" description="한 번에 빠르고 공정하게" onSelect={openGame} />
          <GameCard id="receipt" title="커피 뽑기" description="당첨 커피를 찾아요" onSelect={openGame} />
          <GameCard id="overflow" title="아슬아슬 커피" description="넘치기 전에 다음 사람에게 넘기세요" onSelect={openGame} />
          <GameCard id="ladder" title="사다리타기" description="익숙하지만 끝까지 두근두근" onSelect={openGame} />
          <GameCard id="stop" title="정확히 멈추기" description={`마음속으로 정확히 ${STOP_TARGET_SECONDS}초를 세어보세요`} onSelect={openGame} />
        </section>
        <button className="back-button" type="button" onClick={showSetup}>← 참가자 수정</button>
      </main>
    )
  }

  return (
    <div className="home-page">
      <main className="shell home-hero">
        <section className="intro" aria-labelledby="page-title">
          <div className="steam" aria-hidden="true">~ ~ ~</div>
          <p className="eyebrow">A tiny coffee game</p>
          <h1 id="page-title">{setupContent.heading}</h1>
          <p className="lead">{setupContent.description}</p>
        </section>
        <form className="setup-card" onSubmit={startGames}>
          <div className="card-heading"><div><span className="step">STEP 01</span><h2>함께할 사람을 알려주세요</h2></div><span className="count">{names.length}/12</span></div>
          <div className="name-list">
            {names.map((name, index) => <div className="name-row" key={index}>
              <span>{index + 1}</span>
              <label className="sr-only" htmlFor={`name-${index}`}>참가자 {index + 1} 이름</label>
              <input id={`name-${index}`} aria-label={`참가자 ${index + 1} 이름`} maxLength={20} onChange={(event) => updateName(index, event.target.value)} placeholder="이름 입력" value={name} />
              {names.length > 2 && <button aria-label={`참가자 ${index + 1} 삭제`} className="remove-button" type="button" onClick={() => setNames((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>}
            </div>)}
          </div>
          <button className="add-button" type="button" disabled={names.length >= 12} onClick={() => setNames((current) => [...current, ''])}>+ 참가자 추가</button>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="start-button" type="submit">게임 시작 <span aria-hidden="true">→</span></button>
          <p className="note">2명부터 12명까지 참여할 수 있어요.</p>
        </form>
      </main>
      <HomeEditorial />
    </div>
  )
}

function pushPathname(pathname: string) {
  if (window.location.pathname !== pathname) window.history.pushState(null, '', pathname)
}

const homepageGames = [
  ['01', '룰렛', '빠르고 단순하게'],
  ['02', '커피 뽑기', '하나씩 고르는 긴장감'],
  ['03', '아슬아슬 커피', '넘치기 직전의 스릴'],
  ['04', '사다리타기', '익숙하지만 끝까지 두근두근'],
  ['05', '정확히 멈추기', '감각으로 맞히는 7초'],
]

function HomeEditorial() {
  return <section className="home-editorial" aria-labelledby="home-guide-title">
    <div className="editorial-intro">
      <div>
        <p className="editorial-kicker">FIVE WAYS TO PICK</p>
        <h2 id="home-guide-title">커피 내기,<br />조금 더 재미있게.</h2>
        <p>누가 커피를 살지 정해야 하는 순간, 다섯 가지 가벼운 게임으로 결정해 보세요. 회사 점심시간부터 친구 모임까지, 회원가입 없이 바로 시작할 수 있어요.</p>
      </div>
      <img src={takeawayCup} alt="" aria-hidden="true" height={512} width={512} />
    </div>

    <ol className="editorial-games" aria-label="커피 내기 게임 종류">
      {homepageGames.map(([number, title, description]) => <li key={number}>
        <span>{number}</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </li>)}
    </ol>

    <section className="service-guide" aria-labelledby="service-guide-title">
      <h2 id="service-guide-title">사용 방법</h2>
      <div className="guide-columns">
        <div className="guide-block">
          <h3>세 단계로 시작하세요</h3>
          <ol>
            <li>참가자 이름을 입력합니다.</li>
            <li>원하는 게임을 선택합니다.</li>
            <li>게임을 실행하고 결과를 확인합니다.</li>
          </ol>
        </div>
        <div className="guide-block">
          <h3>랜덤 선택 방식</h3>
          <p>랜덤 선택이 필요한 게임은 브라우저의 보안 난수 기능을 사용해 결과를 결정합니다.</p>
        </div>
        <div className="guide-block">
          <h3>입력 데이터</h3>
          <p>입력한 이름은 서버로 전송하거나 영구 저장하지 않으며, 새로고침하면 사라집니다.</p>
        </div>
      </div>
    </section>

    <footer className="home-footer">
      <strong>Who's Buying Coffee?</strong>
      <span>오늘의 커피를 정하는 가장 가벼운 방법.</span>
    </footer>
  </section>
}

function GameCard({ id, title, description, onSelect }: { id: GameId; title: string; description: string; onSelect: (id: GameId) => void }) {
  return <button aria-label={title} className="game-card" type="button" onClick={() => onSelect(id)}>
    <img alt="" className={`game-art ${id}`} height={512} src={gameArt[id]} width={512} />
    <strong>{title}</strong><small>{description}</small>
  </button>
}

function PresetButton({ label, detail, featured = false, onClick }: { label: string; detail: string; featured?: boolean; onClick: () => void }) {
  return <button aria-label={label} className={`preset-button ${featured ? 'featured' : ''}`} type="button" onClick={onClick}>
    <strong>{label}</strong><small>{detail}</small>
  </button>
}

function participantLabel(participant: Participant, allParticipants: readonly Participant[]): string {
  const duplicateCount = allParticipants.filter((candidate) => candidate.name.toLocaleLowerCase() === participant.name.toLocaleLowerCase()).length
  if (duplicateCount < 2) return participant.name
  return `${participant.name} · ${allParticipants.findIndex((candidate) => candidate.id === participant.id) + 1}번 참가자`
}

function rouletteGradient(participantCount: number): string {
  const segmentAngle = 360 / participantCount
  const colors = Array.from({ length: participantCount }, (_, index) => {
    if (participantCount % 2 === 1 && index === participantCount - 1) return '#c97848'
    return index % 2 === 0 ? '#e8a064' : '#f4d2a9'
  })
  const segments = colors.map((color, index) => `${color} ${index * segmentAngle}deg ${(index + 1) * segmentAngle}deg`)
  return `conic-gradient(${segments.join(', ')})`
}

function revealDelay(defaultDelay: number): number {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 350 : defaultDelay
}

function resultExplanation(gameResult: GameResult): string {
  if (gameResult.gameId === 'stop') return `${STOP_TARGET_SECONDS}초에서 가장 멀리 벗어난 사람이 당첨됐어요.`
  return `참가자 ${gameResult.participantCount}명 · 모두 동일한 확률로 추첨했어요.`
}

function formatSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(2)
}

function GameLayout({ title, description, onBack, children, panelClassName = '', shellClassName = '' }: { title: string; description: ReactNode; onBack: () => void; children: ReactNode; panelClassName?: string; shellClassName?: string }) {
  return <main className={`shell game-shell ${shellClassName}`.trim()}><section className={`play-panel ${panelClassName}`.trim()}>
    <p className="eyebrow">STEP 03</p><h1 className="play-title">{title}</h1><p className="lead">{description}</p>
    <div className="play-area">{children}</div>
    <button className="back-button" type="button" onClick={onBack}>← 게임 선택</button>
  </section></main>
}
