import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkRateLimit } from './rate-limit'

afterEach(() => {
  vi.useRealTimers()
})

describe('checkRateLimit', () => {
  it('上限までは許可する', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('under-limit', 3, 60_000).allowed).toBe(true)
    }
  })

  it('上限を超えたら拒否し、待ち時間を返す', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('over-limit', 3, 60_000)
    }

    const result = checkRateLimit('over-limit', 3, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60)
  })

  it('キーごとに独立して数える', () => {
    checkRateLimit('key-a', 1, 60_000)
    expect(checkRateLimit('key-a', 1, 60_000).allowed).toBe(false)
    expect(checkRateLimit('key-b', 1, 60_000).allowed).toBe(true)
  })

  it('ウィンドウが明けたら再び許可する', () => {
    vi.useFakeTimers()

    checkRateLimit('window-reset', 1, 60_000)
    expect(checkRateLimit('window-reset', 1, 60_000).allowed).toBe(false)

    vi.advanceTimersByTime(60_001)
    expect(checkRateLimit('window-reset', 1, 60_000).allowed).toBe(true)
  })
})
