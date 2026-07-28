import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { routeLengthForViewport } from './features/games/NewGameScreens'

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('App', () => {
  it('scales a ladder route to its rendered viewport length', () => {
    expect(routeLengthForViewport([[0, 0], [100, 0], [100, 100]], 500, 300)).toBe(800)
  })

  it('shows the coffee game setup screen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '커피 내기 랜덤 게임' })).toBeTruthy()
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeTruthy()
  })

  it.each([
    ['/', '커피 내기 랜덤 게임', '이름을 입력하고 원하는 게임을 선택해 커피 내기, 점심 내기, 벌칙자와 당첨자를 간편하게 정해 보세요.'],
    ['/roulette', '랜덤 룰렛 돌리기', '참가자 이름을 입력한 뒤 룰렛을 돌려 커피 내기, 점심 내기, 벌칙자 또는 당첨자를 무작위로 선택할 수 있습니다.'],
    ['/ladder/', '온라인 사다리타기', '참가자 이름을 입력하고 사다리를 실행해 커피 내기, 점심 내기와 벌칙 결과를 무작위로 정할 수 있습니다.'],
  ])('replaces static content with one matching H1 at %s', (pathname, heading, description) => {
    window.history.replaceState(null, '', pathname)
    const container = document.createElement('div')
    container.innerHTML = `<h1>${heading}</h1><p>${description}</p>`

    render(<App />, { container })

    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('h1')?.textContent).toBe(heading)
    expect(container.textContent).toContain(description)
  })

  it('shows a restrained homepage game guide without a pre-start FAQ', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /커피 내기,\s*조금 더 재미있게\./ })).toBeTruthy()
    expect(screen.getByText('룰렛')).toBeTruthy()
    expect(screen.getByText('정확히 멈추기')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '시작하기 전에' })).toBeNull()
  })

  it('moves to game selection after submitting valid names', async () => {
    const user = userEvent.setup()
    render(<App />)

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))

    expect(screen.getByRole('heading', { name: '게임을 선택하세요' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '룰렛' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '사다리타기' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '정확히 멈추기' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '가위바위보 토너먼트' })).toBeNull()
  })

  it.each([
    ['/roulette', '룰렛', '룰렛 돌리기'],
    ['/ladder/', '사다리타기', '사다리 만들기'],
  ])('opens the routed game after participant setup at %s', async (pathname, gameName, controlName) => {
    window.history.replaceState(null, '', pathname)
    const user = userEvent.setup()
    render(<App />)

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))

    expect(screen.getByRole('heading', { name: gameName })).toBeTruthy()
    expect(screen.getByRole('button', { name: controlName })).toBeTruthy()
  })

  it('shows an error instead of silently ignoring invalid names', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    expect(screen.getByRole('alert').textContent).toContain('이름을 입력해 주세요')
  })

  it.each([
    ['룰렛', '룰렛 돌리기', '/roulette'],
    ['커피 뽑기', '쫄깃하게', '/'],
    ['아슬아슬 커피', '다음 사람에게 넘기기', '/'],
    ['사다리타기', '사다리 만들기', '/ladder'],
    ['정확히 멈추기', '도전 시작', '/'],
  ])('opens %s, exposes a working game control, and updates its URL', async (gameName, controlName, pathname) => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: gameName }))
    expect(screen.getByRole('heading', { name: gameName })).toBeTruthy()
    expect(screen.getByRole('button', { name: controlName })).toBeTruthy()
    expect(window.location.pathname).toBe(pathname)
  })

  it('keeps the selected game in sync with browser back and forward navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '룰렛' }))

    expect(window.location.pathname).toBe('/roulette')
    window.history.back()
    await waitFor(() => expect(window.location.pathname).toBe('/'))
    expect(screen.getByRole('heading', { name: '게임을 선택하세요' })).toBeTruthy()

    window.history.forward()
    await waitFor(() => expect(window.location.pathname).toBe('/roulette'))
    expect(screen.getByRole('heading', { name: '룰렛' })).toBeTruthy()
  })

  it('finishes roulette and can return to game selection', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '룰렛' }))
    await user.click(screen.getByRole('button', { name: '룰렛 돌리기' }))
    expect(screen.getByRole('status').textContent).toContain('룰렛이 돌아가고 있어요')
    expect(await screen.findByRole('heading', { name: '오늘의 결제자는' }, { timeout: 4000 })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '다른 게임 선택' }))
    expect(screen.getByRole('heading', { name: '게임을 선택하세요' })).toBeTruthy()
  }, 8000)

  it('uses a third segment color when the roulette has an odd participant count', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    for (let index = 0; index < 3; index += 1) {
      await user.click(screen.getByRole('button', { name: '+ 참가자 추가' }))
    }
    const inputs = screen.getAllByRole('textbox')
    for (let index = 0; index < inputs.length; index += 1) {
      await user.type(inputs[index], `Player ${index + 1}`)
    }
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '룰렛' }))

    const wheel = container.querySelector<HTMLElement>('.roulette-wheel')
    expect(wheel?.style.background).toContain('rgb(201, 120, 72)')
  })

  it('does not show a roulette result after leaving while the wheel is spinning', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '룰렛' }))
    await user.click(screen.getByRole('button', { name: '룰렛 돌리기' }))
    await user.click(screen.getByRole('button', { name: '← 게임 선택' }))

    await new Promise((resolve) => window.setTimeout(resolve, 3400))

    expect(screen.getByRole('heading', { name: '게임을 선택하세요' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '오늘의 결제자는' })).toBeNull()
  }, 6000)

  it('offers coffee drawing length presets before starting', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '커피 뽑기' }))
    expect(screen.getByRole('button', { name: '빠르게' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '쫄깃하게' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '오래 즐기기' })).toBeTruthy()
  })

  it('does not show a coffee drawing result after leaving during the winning event', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '커피 뽑기' }))
    await user.click(screen.getByRole('button', { name: '빠르게' }))

    const cups = screen.getAllByRole('button', { name: /커피잔 선택/ })
    for (const cup of cups) {
      if (screen.queryByRole('status')) break
      await user.click(cup)
    }
    expect(screen.getByRole('status').textContent).toContain('당첨!')
    await user.click(screen.getByRole('button', { name: '← 게임 선택' }))
    await new Promise((resolve) => window.setTimeout(resolve, 1800))

    expect(screen.getByRole('heading', { name: '게임을 선택하세요' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '오늘의 결제자는' })).toBeNull()
  }, 6000)

  it('does not show an overflow result after leaving during the spill event', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '아슬아슬 커피' }))
    for (let turn = 0; turn < 10; turn += 1) {
      if (screen.queryByRole('status')) break
      await user.click(screen.getByRole('button', { name: '다음 사람에게 넘기기' }))
    }
    expect(screen.getByRole('status').textContent).toContain('커피가 넘쳤다')
    await user.click(screen.getByRole('button', { name: '← 게임 선택' }))
    await new Promise((resolve) => window.setTimeout(resolve, 1600))

    expect(screen.getByRole('heading', { name: '게임을 선택하세요' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '오늘의 결제자는' })).toBeNull()
  }, 6000)

  it('fills coffee inside a cutaway cup instead of a separate meter', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '아슬아슬 커피' }))

    expect(container.querySelector('.cutaway-cup')).toBeTruthy()
    expect(container.querySelector('.coffee-fill')).toBeTruthy()
    expect(container.querySelector('.overflow-meter')).toBeNull()
  })

  it('reveals each seven-second attempt immediately', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '정확히 멈추기' }))
    await user.click(screen.getByRole('button', { name: '도전 시작' }))
    expect(screen.queryByText(/초$/)).toBeNull()
    await user.click(screen.getByRole('button', { name: '지금!' }))
    expect(screen.getByRole('status').textContent).toMatch(/초 · 7초와 .*초 차이/)
    expect(screen.getByText('Joon', { selector: '.turn-name' })).toBeTruthy()
  })

  it('shows every seven-second attempt on the final result', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '정확히 멈추기' }))

    await user.click(screen.getByRole('button', { name: '도전 시작' }))
    await user.click(screen.getByRole('button', { name: '지금!' }))
    await user.click(screen.getByRole('button', { name: '도전 시작' }))
    await user.click(screen.getByRole('button', { name: '지금!' }))

    expect(await screen.findByRole('heading', { name: '오늘의 결제자는' }, { timeout: 3000 })).toBeTruthy()
    const records = screen.getByLabelText('전체 참가자 기록')
    expect(records.textContent).toMatch(/Mina · \d+\.\d{2}초/)
    expect(records.textContent).toMatch(/Joon · \d+\.\d{2}초/)
  }, 5000)

  it('keeps ladder outcomes hidden until the ladder starts', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '사다리타기' }))
    expect(screen.queryByText('결제')).toBeNull()
    expect(screen.queryByText('통과')).toBeNull()
  })

  it('reveals one ladder route on the board without opening the generic result page', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '사다리타기' }))
    await user.click(screen.getByRole('button', { name: '사다리 만들기' }))
    await user.click(screen.getByRole('button', { name: '1번 경로 보기' }))
    expect(await screen.findByRole('status', {}, { timeout: 2500 })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '오늘의 결제자는' })).toBeNull()
    expect(screen.getByRole('button', { name: '바로 공개' })).toBeTruthy()
  })

  it('reveals the ladder result immediately when the route animation ends', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '사다리타기' }))
    await user.click(screen.getByRole('button', { name: '사다리 만들기' }))
    await user.click(screen.getByRole('button', { name: '1번 사다리 경로 보기' }))

    const routeLine = container.querySelector<SVGPolylineElement>('.ladder-route polyline')
    expect(routeLine?.getAttribute('pathLength')).toBeNull()
    expect(Number(routeLine?.style.getPropertyValue('--route-length'))).toBeGreaterThan(1)

    const routeEnd = new Event('animationend', { bubbles: true })
    Object.defineProperty(routeEnd, 'animationName', { value: 'route-trace' })
    fireEvent(container.querySelector('.ladder-route')!, routeEnd)

    expect(await screen.findByRole('status', {}, { timeout: 500 })).toBeTruthy()
    expect(screen.queryByText('1번 경로를 따라 내려가는 중…')).toBeNull()
  })

  it('reveals a ladder route when its number at the top of the board is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '사다리타기' }))
    await user.click(screen.getByRole('button', { name: '사다리 만들기' }))

    await user.click(screen.getByRole('button', { name: '1번 사다리 경로 보기' }))

    expect(screen.getByText('1번 경로를 따라 내려가는 중…')).toBeTruthy()
  })

  it('reveals the winning route instantly, shows every outcome, and can restart the ladder', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Joon')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '사다리타기' }))
    await user.click(screen.getByRole('button', { name: '사다리 만들기' }))

    await user.click(screen.getByRole('button', { name: '바로 공개' }))

    expect(container.querySelectorAll('.ladder-route')).toHaveLength(1)
    expect(container.querySelector('.ladder-route.instant')).toBeTruthy()
    expect(screen.getAllByText('당첨')).toHaveLength(1)
    expect(screen.getAllByText('통과')).toHaveLength(1)
    expect(screen.queryByText(/경로를 따라 내려가는 중/)).toBeNull()

    await user.click(screen.getByRole('button', { name: '다시 하기' }))

    expect(container.querySelector('.ladder-route')).toBeNull()
    expect(screen.queryByText('당첨')).toBeNull()
    expect(screen.queryByText('통과')).toBeNull()
    expect(screen.getByRole('button', { name: '바로 공개' })).toBeTruthy()
  })

  it('disambiguates duplicate names in the new games', async () => {
    const user = userEvent.setup()
    render(<App />)
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Mina')
    await user.type(inputs[1], 'Mina')
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '사다리타기' }))
    expect(screen.getByText('Mina · 1번 참가자')).toBeTruthy()
    expect(screen.getByText('Mina · 2번 참가자')).toBeTruthy()
  })

  it('gives a wide ladder a horizontal scroll area for twelve participants', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    for (let index = 0; index < 10; index += 1) await user.click(screen.getByRole('button', { name: '+ 참가자 추가' }))
    const inputs = screen.getAllByRole('textbox')
    for (let index = 0; index < inputs.length; index += 1) await user.type(inputs[index], `P${index + 1}`)
    await user.click(screen.getByRole('button', { name: '게임 시작' }))
    await user.click(screen.getByRole('button', { name: '사다리타기' }))
    expect(container.querySelector('.ladder-scroll')).toBeTruthy()
    expect(container.querySelector<HTMLElement>('.ladder-board')?.style.getPropertyValue('--lane-count')).toBe('12')
  })

})
