import { describe, expect, it } from 'vitest'
import { validateParticipantNames } from './validateParticipants'

describe('validateParticipantNames', () => {
  it('trims and converts 2 to 12 unique names', () => {
    expect(validateParticipantNames([' Mina ', 'Joon'])).toEqual({
      ok: true,
      participants: [
        { id: 'participant-0', name: 'Mina' },
        { id: 'participant-1', name: 'Joon' },
      ],
    })
  })

  it.each([
    { names: ['Mina'], code: 'too-few' },
    { names: Array.from({ length: 13 }, (_, i) => `P${i}`), code: 'too-many' },
    { names: ['Mina', '   '], code: 'blank-name' },
    { names: ['A'.repeat(21), 'Joon'], code: 'name-too-long' },
  ] as const)('rejects $code', ({ names, code }) => {
    expect(validateParticipantNames([...names])).toEqual({ ok: false, code })
  })

  it('allows duplicate display names while keeping unique participant ids', () => {
    expect(validateParticipantNames(['Mina', 'Mina'])).toEqual({
      ok: true,
      participants: [
        { id: 'participant-0', name: 'Mina' },
        { id: 'participant-1', name: 'Mina' },
      ],
    })
  })
})
