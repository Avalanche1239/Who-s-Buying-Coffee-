export type RandomSource = (target: Uint32Array<ArrayBuffer>) => Uint32Array<ArrayBuffer>

const nativeSource: RandomSource = (target) => crypto.getRandomValues(target)

export function secureInt(maxExclusive: number, source: RandomSource = nativeSource): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x1_0000_0000) {
    throw new RangeError('maxExclusive must be an integer between 1 and 2^32')
  }
  const range = 0x1_0000_0000
  const limit = range - (range % maxExclusive)
  const buffer = new Uint32Array(1)
  do source(buffer)
  while (buffer[0] >= limit)
  return buffer[0] % maxExclusive
}

export function secureShuffle<T>(items: readonly T[], source: RandomSource = nativeSource): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = secureInt(index + 1, source)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function chooseOne<T>(items: readonly T[], source: RandomSource = nativeSource): T {
  if (items.length === 0) throw new RangeError('Cannot choose from an empty list')
  return items[secureInt(items.length, source)]
}
