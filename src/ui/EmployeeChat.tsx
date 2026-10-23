import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LIMITS } from '../config/limits'
import { nextReleaseWindow } from '../domain/schedule'
import { employeeView, type Ticket } from '../domain/ticket'
import { clock, dateTime } from './format'

const SUGGESTIONS = [
  'How many vacation days do I get?',
  'Can I work from home?',
  'How do I submit an expense report?',
]

const REDACTION_LABEL = {
  email: 'an email address',
  ssn: 'a Social Security number',
  phone: 'a phone number',
  'long-number': 'a long number',
} as const

export default function EmployeeChat(props: {
  tickets: Ticket[]
  onSubmit: (question: string) => string | null
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const sorted = [...props.tickets].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [props.tickets.length])

  function send(e: FormEvent) {
    e.preventDefault()
    const err = props.onSubmit(text)
    setError(err)
    if (!err) setText('')
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-5 px-4 py-6">
        <Bubble side="left">
          Hi! Ask any question about Northgate policies: time off, benefits, expenses, remote work
          and more. Every answer is checked by a person in HR before it is sent to you.
        </Bubble>

        {sorted.map((t) => (
          <Exchange key={t.id} ticket={t} />
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="sticky bottom-0 border-t border-stone-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {sorted.length === 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setText(s)}
                className="rounded-full border border-stone-300 px-3 py-1 text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <label htmlFor="question" className="sr-only">
          Your question for HR
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="question"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) send(e)
            }}
            maxLength={LIMITS.MAX_QUESTION_CHARS}
            rows={2}
            placeholder="Ask HR a question…"
            className="min-h-12 flex-1 resize-none rounded-xl border border-stone-300 px-3 py-2 text-base focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
          <button
            type="submit"
            className="h-12 rounded-xl bg-brand-700 px-5 font-medium text-white hover:bg-brand-900"
          >
            Send
          </button>
        </div>
        <div className="mt-1.5 flex justify-between gap-3 text-xs text-stone-500">
          <p role={error ? 'alert' : undefined} className={error ? 'text-red-700' : ''}>
            {error ?? 'Please don’t include personal details like SSNs or phone numbers.'}
          </p>
          <span className="shrink-0 tabular-nums">
            {text.length}/{LIMITS.MAX_QUESTION_CHARS}
          </span>
        </div>
      </form>
    </div>
  )
}

function Exchange({ ticket }: { ticket: Ticket }) {
  const view = employeeView(ticket)
  const [nextRelease] = useState(() => nextReleaseWindow(new Date()))
  return (
    <div className="space-y-2" data-testid="exchange">
      <Bubble side="right">{ticket.question}</Bubble>
      {ticket.redactions.length > 0 && (
        <p className="text-right text-xs text-stone-500">
          We removed {ticket.redactions.map((k) => REDACTION_LABEL[k]).join(', ')} before saving.
        </p>
      )}
      {view.state === 'answered' && (
        <Bubble side="left">
          <span className="whitespace-pre-line">{view.answer}</span>
          <span className="mt-2 block text-xs text-brand-700">
            ✓ Reviewed by HR · {dateTime(view.at)}
          </span>
        </Bubble>
      )}
      {view.state === 'with-hr' && (
        <Bubble side="left" muted>
          Your question is with HR. A reviewer checks every answer before it’s sent. Next release:{' '}
          <strong>{clock(nextRelease)}</strong>.
        </Bubble>
      )}
      {view.state === 'follow-up' && (
        <Bubble side="left" muted>
          HR will contact you directly about this one.
        </Bubble>
      )}
    </div>
  )
}

function Bubble(props: { side: 'left' | 'right'; muted?: boolean; children: React.ReactNode }) {
  const right = props.side === 'right'
  return (
    <div className={`flex ${right ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[70%] ${
          right
            ? 'rounded-br-sm bg-brand-700 text-white'
            : props.muted
              ? 'rounded-bl-sm border border-dashed border-stone-300 bg-white text-stone-600'
              : 'rounded-bl-sm bg-white text-stone-800 shadow-sm ring-1 ring-stone-200'
        }`}
      >
        {props.children}
      </div>
    </div>
  )
}
