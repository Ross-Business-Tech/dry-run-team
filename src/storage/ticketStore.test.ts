import { describe, expect, it } from 'vitest'
import { LIMITS } from '../config/limits'
import { demoTickets } from '../data/seed'
import type { Ticket } from '../domain/ticket'
import {
  isTicket,
  load,
  prune,
  save,
  SCHEMA_VERSION,
  STORAGE_KEY,
  type KeyValueStore,
} from './ticketStore'

function memory(
  initial: Record<string, string> = {},
): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial }
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
}

const seed = demoTickets(new Date('2026-10-23T12:00:00Z'))

describe('ticket store', () => {
  it('round-trips tickets', () => {
    const store = memory()
    expect(save(store, { version: SCHEMA_VERSION, tickets: seed, lastSubmitAt: 5 })).toBe(true)
    expect(load(store)).toEqual({
      saved: { version: SCHEMA_VERSION, tickets: seed, lastSubmitAt: 5 },
      problem: 'none',
    })
  })

  it('reports an empty store', () => {
    expect(load(memory()).problem).toBe('empty')
  })

  it.each(['not json', '{"version":99,"tickets":[]}', '{"version":1,"tickets":"x"}'])(
    'treats %s as corrupt instead of crashing',
    (raw) => {
      const r = load(memory({ [STORAGE_KEY]: raw }))
      expect(r.problem).toBe('corrupt')
      expect(r.saved.tickets).toEqual([])
    },
  )

  it('drops individual invalid tickets and keeps valid ones', () => {
    const bad = { ...seed[0], status: 'hacked' }
    const raw = JSON.stringify({ version: 1, tickets: [bad, seed[1]], lastSubmitAt: null })
    const r = load(memory({ [STORAGE_KEY]: raw }))
    expect(r.problem).toBe('corrupt')
    expect(r.saved.tickets).toEqual([seed[1]])
  })

  it('returns false when the browser refuses to save', () => {
    const store: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
    }
    expect(save(store, { version: 1, tickets: [], lastSubmitAt: null })).toBe(false)
  })

  it('survives a store whose read throws', () => {
    const store: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {},
    }
    expect(load(store).problem).toBe('empty')
  })
})

describe('demo seed (schema drift check)', () => {
  it('every seeded ticket validates against the current schema', () => {
    expect(seed.length).toBeGreaterThan(0)
    expect(seed.every(isTicket)).toBe(true)
  })

  it('covers every status so the demo shows the whole workflow', () => {
    expect(new Set(seed.map((t) => t.status))).toEqual(
      new Set(['draft', 'approved', 'rejected', 'released']),
    )
  })
})

describe('prune', () => {
  const make = (i: number, status: Ticket['status']): Ticket => ({
    ...seed[0]!,
    id: String(i),
    createdAt: new Date(2026, 0, 1, 0, i).toISOString(),
    status,
  })

  it('removes the oldest finished tickets first and never pending ones', () => {
    const pending = Array.from({ length: LIMITS.MAX_TICKETS }, (_, i) => make(1000 + i, 'draft'))
    const old = make(1, 'released')
    const newer = make(2, 'released')
    const out = prune([newer, ...pending, old])
    expect(out).toHaveLength(LIMITS.MAX_TICKETS)
    expect(out.every((t) => t.status === 'draft')).toBe(true)
  })

  it('leaves a list under the cap untouched', () => {
    const list = [make(1, 'released'), make(2, 'draft')]
    expect(prune(list)).toEqual(list)
  })

  it('keeps pending tickets even if that leaves the list over the cap', () => {
    const pending = Array.from({ length: LIMITS.MAX_TICKETS + 2 }, (_, i) => make(i, 'draft'))
    expect(prune(pending)).toHaveLength(LIMITS.MAX_TICKETS + 2)
  })
})
