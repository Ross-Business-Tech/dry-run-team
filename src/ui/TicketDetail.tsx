import { useState } from 'react'
import { LIMITS } from '../config/limits'
import { approve, reject, release, returnToDraft, type Ticket } from '../domain/ticket'
import { dateTime } from './format'
import { Badge } from './ReviewQueue'

export default function TicketDetail(props: {
  ticket: Ticket
  onBack: () => void
  onChange: (t: Ticket, message: string) => void
}) {
  const t = props.ticket
  const [answer, setAnswer] = useState(t.finalAnswer ?? t.draft)
  const [confirmed, setConfirmed] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const now = () => new Date().toISOString()
  const by = { role: 'reviewer' as const }

  function run(r: ReturnType<typeof approve>, message: string) {
    if (r.ok) props.onChange(r.ticket, message)
    else setError(r.error)
  }

  return (
    <article className="space-y-5 p-4 md:p-6">
      <button onClick={props.onBack} className="text-sm font-medium text-brand-700 md:hidden">
        ← Back to queue
      </button>

      <header>
        <p className="text-xs tracking-wide text-stone-500 uppercase">
          Employee question · {dateTime(t.createdAt)}
        </p>
        <p className="mt-1 text-lg">{t.question}</p>
        {t.redactions.length > 0 && (
          <p className="mt-1 text-xs text-stone-500">
            Personal details were removed automatically.
          </p>
        )}
      </header>

      {t.risk.level === 'high' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">High-risk topic: check against current law</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            {t.risk.reasons.map((r) => (
              <Badge key={r} tone="red">
                {r}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold">Policy sources used for the draft</h2>
        {t.sources.length === 0 ? (
          <p className="mt-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            No matching policy was found, so there is no draft. Write the answer yourself, or reject
            the ticket and follow up directly.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {t.sources.map((s) => (
              <li key={`${s.policyId}-${s.heading}`}>
                <details className="rounded-lg bg-white p-3 text-sm ring-1 ring-stone-200">
                  <summary className="cursor-pointer font-medium">
                    {s.policyTitle} – {s.heading}
                  </summary>
                  <p className="mt-2 text-stone-700">{s.passage}</p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      {t.status === 'draft' && (
        <section className="space-y-3">
          <label htmlFor="answer" className="block text-sm font-semibold">
            Answer to the employee <span className="font-normal text-stone-500">(edit freely)</span>
          </label>
          <textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={LIMITS.MAX_DRAFT_CHARS}
            rows={12}
            className="w-full rounded-xl border border-stone-300 p-3 text-[15px] leading-relaxed focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
          {t.risk.level === 'high' && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 size-4 accent-brand-700"
              />
              I checked this answer against current employment law and our legal guidance.
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                run(
                  approve(t, {
                    ...by,
                    finalAnswer: answer,
                    highRiskConfirmed: confirmed,
                    now: now(),
                  }),
                  'Approved. It will go out with the next release.',
                )
              }
              className="rounded-lg bg-brand-700 px-4 py-2.5 font-medium text-white hover:bg-brand-900"
            >
              Approve answer
            </button>
            <button
              onClick={() => setRejecting((v) => !v)}
              className="rounded-lg px-4 py-2.5 font-medium text-stone-700 ring-1 ring-stone-300"
            >
              Follow up directly instead
            </button>
          </div>
        </section>
      )}

      {t.status === 'approved' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Approved answer (not yet released)</h2>
          <p className="rounded-xl bg-white p-3 text-[15px] whitespace-pre-line ring-1 ring-stone-200">
            {t.finalAnswer}
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => run(release(t, { ...by, now: now() }), 'Released to the employee.')}
              className="rounded-lg bg-brand-700 px-4 py-2.5 font-medium text-white hover:bg-brand-900"
            >
              Release now
            </button>
            <button
              onClick={() => run(returnToDraft(t, by), 'Moved back to “To review”.')}
              className="rounded-lg px-4 py-2.5 font-medium text-stone-700 ring-1 ring-stone-300"
            >
              Edit again
            </button>
            <button
              onClick={() => setRejecting((v) => !v)}
              className="rounded-lg px-4 py-2.5 font-medium text-stone-700 ring-1 ring-stone-300"
            >
              Follow up directly instead
            </button>
          </div>
        </section>
      )}

      {rejecting && (t.status === 'draft' || t.status === 'approved') && (
        <section className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-stone-200">
          <label htmlFor="note" className="block text-sm font-semibold">
            Internal note: how will HR follow up?
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={LIMITS.MAX_REVIEW_NOTE_CHARS}
            rows={3}
            className="w-full rounded-lg border border-stone-300 p-2 text-[15px]"
          />
          <p className="text-xs text-stone-500">
            The employee only sees “HR will contact you directly”, never this note.
          </p>
          <button
            onClick={() => run(reject(t, { ...by, note, now: now() }), 'Moved to “HR follow-up”.')}
            className="rounded-lg bg-stone-800 px-4 py-2 font-medium text-white"
          >
            Move to HR follow-up
          </button>
        </section>
      )}

      {t.status === 'released' && (
        <section>
          <h2 className="text-sm font-semibold">
            Sent to the employee {t.releasedAt && `· ${dateTime(t.releasedAt)}`}
          </h2>
          <p className="mt-2 rounded-xl bg-white p-3 text-[15px] whitespace-pre-line ring-1 ring-stone-200">
            {t.finalAnswer}
          </p>
        </section>
      )}

      {t.status === 'rejected' && (
        <section>
          <h2 className="text-sm font-semibold">Internal follow-up note</h2>
          <p className="mt-2 rounded-xl bg-white p-3 text-[15px] ring-1 ring-stone-200">
            {t.reviewerNote}
          </p>
        </section>
      )}
    </article>
  )
}
