import type { Participant } from '../../types/participant'

export type ValidationErrorCode =
  | 'too-few'
  | 'too-many'
  | 'blank-name'
  | 'name-too-long'

export type ValidationResult =
  | { ok: true; participants: Participant[] }
  | { ok: false; code: ValidationErrorCode }

export function validateParticipantNames(names: string[]): ValidationResult {
  if (names.length < 2) return { ok: false, code: 'too-few' }
  if (names.length > 12) return { ok: false, code: 'too-many' }
  const trimmed = names.map((name) => name.trim())
  if (trimmed.some((name) => name.length === 0)) return { ok: false, code: 'blank-name' }
  if (trimmed.some((name) => [...name].length > 20)) return { ok: false, code: 'name-too-long' }
  return {
    ok: true,
    participants: trimmed.map((name, index) => ({ id: `participant-${index}`, name })),
  }
}
