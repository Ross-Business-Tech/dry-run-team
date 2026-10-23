import { useState } from 'react'
import { releaseAllApproved, type Status, type Ticket } from '../domain/ticket'
import { ago } from './format'
import TicketDetail from './TicketDetail'

const TABS: { status: Status; label: string }[] = [
  { status: 'draft', label: 'To review' },
  { status: 'approved', label: 'Approved' },
  { status: 'released', label: 'Released' },
  { status: 'rejected', label: 'Follow-up' },
]

export default function ReviewQueue(props: {
  tickets: Ticket[]
  onChange: (t: Ticket) => void
  onReplaceAll: (ts: Ticket[]) => void
}) {
  const [tab, setTab] = useState<Status>('draft')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const count = (s: Status) => props.tickets.filter((t) => t.status === s).length
  // High-risk first, then oldest first: the riskiest and longest-waiting get looked at first.
  const list = props.tickets
    .filter((t) => t.status === tab)
    .sort((a, b) =>
      a.risk.level !== b.risk.level
        ? a.risk.level === 'high'
          ? -1
          : 1
        : a.createdAt.localeCompare(b.createdAt),
    )
  const selected = props.tickets.find((t) => t.id === selectedId) ?? null

  function releaseAll() {
    const n = count('approved')
    if (!window.confirm(`Release ${n} approved answer${n === 1 ? '' : 's'} to employees now?`)) {
      return
    }
    const r = releaseAllApproved(props.tickets, { role: 'reviewer', now: new Date().toISOString() })
    if (!r.ok) return setFlash(r.error)
    props.onReplaceAll(r.tickets)
    setFlash(`${r.released} answer${r.released === 1 ? '' : 's'} released to employees.`)
  }

  function changed(t: Ticket, message: string) {
    props.onChange(t)
    setFlash(message)
    setSelectedId(null)
  }

  return (
    <div className="flex flex-1 flex-col md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-0">
      <section className={`${selected ? 'hidden md:block' : ''} md:border-r md:border-stone-200`}>
        <div className="sticky top-[61px] z-[5] border-b border-stone-200 bg-stone-50 px-4 pt-4">
          <div role="tablist" aria-label="Queue" className="-mx-1 flex flex-wrap gap-x-1 pb-px">
            {TABS.map(({ status, label }) => (
              <button
                key={status}
                role="tab"
                aria-selected={tab === status}
                onClick={() => {
                  setTab(status)
                  setSelectedId(null)
                }}
                className={`shrink-0 border-b-2 px-2.5 py-2 text-sm font-medium ${
                  tab === status
                    ? 'border-brand-700 text-brand-700'
                    : 'border-transparent text-stone-500'
                }`}
              >
                {label} <span className="tabular-nums">({count(status)})</span>
              </button>
            ))}
          </div>
        </div>

        {flash && (
          <p
            role="status"
            className="mx-4 mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900"
          >
            {flash}
          </p>
        )}

        {tab === 'approved' && count('approved') > 0 && (
          <div className="mx-4 mt-3 rounded-xl border border-brand-100 bg-white p-3">
            <p className="text-sm text-stone-600">
              Approved answers wait here until the next release (10:00 and 16:00).
            </p>
            <button
              onClick={releaseAll}
              className="mt-2 w-full rounded-lg bg-brand-700 px-4 py-2.5 font-medium text-white hover:bg-brand-900"
            >
              Release {count('approved')} approved answer{count('approved') === 1 ? '' : 's'}
            </button>
          </div>
        )}

        <ul className="space-y-2 p-4">
          {list.length === 0 && (
            <li className="py-10 text-center text-sm text-stone-500">Nothing here right now.</li>
          )}
          {list.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => {
                  setSelectedId(t.id)
                  setFlash(null)
                }}
                aria-current={selectedId === t.id}
                className={`w-full rounded-xl bg-white p-3 text-left shadow-sm ring-1 transition hover:ring-brand-600 ${
                  selectedId === t.id ? 'ring-2 ring-brand-600' : 'ring-stone-200'
                }`}
              >
                <p className="line-clamp-2 text-[15px]">{t.question}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  {t.risk.level === 'high' && <Badge tone="red">High risk</Badge>}
                  {t.sources.length === 0 && <Badge tone="amber">No policy match</Badge>}
                  <span className="text-stone-500">{ago(t.createdAt)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${selected ? '' : 'hidden md:block'} min-w-0`}>
        {selected ? (
          <TicketDetail
            key={selected.id}
            ticket={selected}
            onBack={() => setSelectedId(null)}
            onChange={changed}
          />
        ) : (
          <p className="p-10 text-center text-sm text-stone-500">Select a ticket to review it.</p>
        )}
      </section>
    </div>
  )
}

export function Badge(props: { tone: 'red' | 'amber' | 'green'; children: React.ReactNode }) {
  const tones = {
    red: 'bg-red-50 text-red-800 ring-red-200',
    amber: 'bg-amber-50 text-amber-900 ring-amber-200',
    green: 'bg-brand-50 text-brand-900 ring-brand-100',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ${tones[props.tone]}`}>
      {props.children}
    </span>
  )
}
