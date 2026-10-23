import { RELEASE_WINDOWS } from '../config/limits'

/** The next HR release time after `now`, in local time. */
export function nextReleaseWindow(now: Date, windows: readonly string[] = RELEASE_WINDOWS): Date {
  const times = windows.map((w) => w.split(':').map(Number) as [number, number])
  for (let day = 0; day < 2; day++) {
    for (const [h, m] of times) {
      const d = new Date(now)
      d.setDate(d.getDate() + day)
      d.setHours(h, m, 0, 0)
      if (d > now) return d
    }
  }
  throw new Error('No release windows configured')
}
