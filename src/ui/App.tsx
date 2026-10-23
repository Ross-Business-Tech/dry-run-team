import { useState } from 'react'
import type { Role } from '../domain/ticket'
import EmployeeChat from './EmployeeChat'
import ReviewQueue from './ReviewQueue'
import { useTickets } from './useTickets'

const NOTICES = {
  'reset-corrupt': 'Some saved data could not be read, so the demo was restored.',
  'not-saving': 'This browser is not saving data (private mode?). Changes will be lost on reload.',
} as const

export default function App() {
  const [role, setRole] = useState<Role>('employee')
  const store = useTickets()
  const pending = store.tickets.filter((t) => t.status === 'draft').length

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-lg bg-brand-700 font-bold text-white"
            >
              N
            </span>
            <div className="leading-tight">
              <h1 className="font-semibold">Northgate HR Helpdesk</h1>
              <p className="text-xs text-stone-500">Prototype · sample data only</p>
            </div>
          </div>
          <div
            role="tablist"
            aria-label="View as"
            className="flex rounded-lg bg-stone-100 p-1 text-sm font-medium"
          >
            {(['employee', 'reviewer'] as const).map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={role === r}
                onClick={() => setRole(r)}
                className={`rounded-md px-3 py-1.5 transition ${
                  role === r ? 'bg-white text-brand-700 shadow-sm' : 'text-stone-600'
                }`}
              >
                {r === 'employee' ? 'Employee' : 'HR reviewer'}
                {r === 'reviewer' && pending > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-xs text-white">
                    {pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {store.notice !== 'none' && (
        <div className="bg-amber-50 text-sm text-amber-900">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
            <p>{NOTICES[store.notice]}</p>
            <button onClick={store.dismissNotice} className="font-medium underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        {role === 'employee' ? (
          <EmployeeChat tickets={store.tickets} onSubmit={store.submit} />
        ) : (
          <ReviewQueue
            tickets={store.tickets}
            onChange={store.replace}
            onReplaceAll={store.replaceAll}
          />
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white text-xs text-stone-500">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p>Demo: the role switch is not a login. Data stays in this browser.</p>
          <button
            onClick={() => {
              if (window.confirm('Reset the demo? This clears every ticket in this browser.')) {
                store.reset()
              }
            }}
            className="font-medium text-stone-700 underline"
          >
            Reset demo
          </button>
        </div>
      </footer>
    </div>
  )
}
