import { useCallback, useState } from 'react'
import { demoTickets } from '../data/seed'
import { createTicket } from '../domain/createTicket'
import { validateQuestion } from '../domain/submission'
import type { Ticket } from '../domain/ticket'
import { load, save, SCHEMA_VERSION, type Saved } from '../storage/ticketStore'

export type Notice = 'none' | 'reset-corrupt' | 'not-saving'
interface State {
  saved: Saved
  notice: Notice
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Saves and reports a failure as a notice, so a refusing browser is never silent. */
function persist(saved: Saved, notice: Notice): State {
  const store = storage()
  const ok = store !== null && save(store, saved)
  return { saved, notice: ok ? notice : 'not-saving' }
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function fresh(): Saved {
  return { version: SCHEMA_VERSION, tickets: demoTickets(new Date()), lastSubmitAt: null }
}

function initial(): State {
  const store = storage()
  if (!store) return { saved: fresh(), notice: 'not-saving' }
  const { saved, problem } = load(store)
  if (problem === 'empty') return persist(fresh(), 'none')
  if (problem === 'corrupt') {
    return persist(saved.tickets.length > 0 ? saved : fresh(), 'reset-corrupt')
  }
  return { saved, notice: 'none' }
}

export function useTickets() {
  const [{ saved, notice }, setState] = useState(initial)
  const commit = useCallback((next: Saved) => setState((s) => persist(next, s.notice)), [])

  /** Returns an error message, or null when the question was accepted. */
  const submit = useCallback(
    (raw: string): string | null => {
      const now = Date.now()
      const v = validateQuestion(raw, saved.lastSubmitAt, now)
      if (!v.ok) return v.error
      const ticket = createTicket(v.question, { id: newId(), now: new Date(now).toISOString() })
      commit({ ...saved, tickets: [...saved.tickets, ticket], lastSubmitAt: now })
      return null
    },
    [saved, commit],
  )

  const replace = useCallback(
    (ticket: Ticket) =>
      commit({ ...saved, tickets: saved.tickets.map((t) => (t.id === ticket.id ? ticket : t)) }),
    [saved, commit],
  )

  const replaceAll = useCallback(
    (tickets: Ticket[]) => commit({ ...saved, tickets }),
    [saved, commit],
  )
  const reset = useCallback(() => setState(persist(fresh(), 'none')), [])
  const dismissNotice = useCallback(() => setState((s) => ({ ...s, notice: 'none' })), [])

  return { tickets: saved.tickets, notice, submit, replace, replaceAll, reset, dismissNotice }
}
