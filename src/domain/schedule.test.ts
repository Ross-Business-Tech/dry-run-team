import { describe, expect, it } from 'vitest'
import { nextReleaseWindow } from './schedule'

describe('nextReleaseWindow', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 23, h, m)

  it('picks the morning window before 10:00', () => {
    expect(nextReleaseWindow(at(8))).toEqual(at(10))
  })
  it('picks the afternoon window between windows', () => {
    expect(nextReleaseWindow(at(10, 1))).toEqual(at(16))
  })
  it('rolls over to tomorrow morning after the last window', () => {
    expect(nextReleaseWindow(at(17))).toEqual(new Date(2026, 9, 24, 10))
  })
  it('throws when no windows are configured', () => {
    expect(() => nextReleaseWindow(at(8), [])).toThrow()
  })
})
