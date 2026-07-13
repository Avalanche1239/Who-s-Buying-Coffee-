import { describe, expect, it } from 'vitest'
import { chooseOne, secureInt, secureShuffle, type RandomSource } from './secureRandom'

function sequence(...values: number[]): RandomSource {
  let index = 0
  return (target) => {
    target[0] = values[index++] ?? 0
    return target
  }
}

describe('secure random helpers', () => {
  it('chooses a bounded integer', () => {
    expect(secureInt(4, sequence(7))).toBe(3)
  })

  it('rejects modulo-biased values before choosing', () => {
    expect(secureInt(3, sequence(0xffff_ffff, 5))).toBe(2)
  })

  it('shuffles without mutating the input', () => {
    const input = ['a', 'b', 'c']
    expect(secureShuffle(input, sequence(0, 0))).toEqual(['b', 'c', 'a'])
    expect(input).toEqual(['a', 'b', 'c'])
  })

  it('chooses one item and rejects an empty list', () => {
    expect(chooseOne(['Mina', 'Joon'], sequence(1))).toBe('Joon')
    expect(() => chooseOne([])).toThrow(RangeError)
  })
})
