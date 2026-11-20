import { isLate } from '../shared/Forms'
import React, { useState } from 'react'
import { Pill } from '../shared/ui.jsx'
import {
  ClipboardList,
  Compass,
  Flag,
  LockKeyhole,
  ChevronRight,
  Check,
} from 'lucide-react'
export function Employee({ profile, initialFilter, act, busy }) {
  const [filter, setFilter] = useState(initialFilter || 'All'),
    [open, setOpen] = useState(null)
  const { tasks, readiness } = profile,
    next = tasks.find((t) => t.id === profile.next)
  const blocked = tasks.filter((t) => t.status === 'Blocked')
  const visibleTasks = tasks.filter((t) => {
    if (filter === 'Pending') return t.status !== 'Complete'
    if (filter === 'Overdue') return isLate(t)
    if (filter === 'Day one') return readiness.remaining.includes(t.id)
    return filter === 'All' || filter === t.status
  })
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">DAY-ONE READINESS</div>
          <h2>
            {readiness.ready ? 'Ready for day one' : 'Your onboarding journey'}
          </h2>
          <p>
            {readiness.complete} of {readiness.total} required tasks complete
          </p>
          <progress
            aria-label="Day-one readiness"
            max={readiness.total || 1}
            value={readiness.complete}
          />
        </div>
        <div className="heroflag">
          <Flag size={44} strokeWidth={1} />
        </div>
      </section>
      <div className="dashboard">
        <section className="panel">
          <div className="secthead">
            <ClipboardList size={20} />
            <h2>My checklist</h2>
            <span className="count">{tasks.length}</span>
          </div>
          <div className="tabs">
            {[
              'All',
              'Day one',
              'Available',
              'Blocked',
              'Complete',
              'Pending',
              'Overdue',
            ].map((f) => (
              <button
                className={filter === f ? 'active' : ''}
                aria-pressed={filter === f}
                key={f}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          {visibleTasks.map((t) => (
            <article className="task" key={t.id}>
              <button
                className="taskrow"
                onClick={() => setOpen(open === t.id ? null : t.id)}
                aria-expanded={open === t.id}
              >
                <span className={'taskicon ' + t.status.toLowerCase()}>
                  {t.status === 'Complete' ? (
                    <Check />
                  ) : t.status === 'Blocked' ? (
                    <LockKeyhole />
                  ) : (
                    <ClipboardList />
                  )}
                </span>
                <span className="taskname">
                  <strong>{t.title}</strong>
                  <small>
                    {t.category} · {t.owner.name}
                  </small>
                </span>
                <Pill value={t.status} />
                <ChevronRight size={15} />
              </button>
              {open === t.id && (
                <div className="taskdetail">
                  <p>{t.description}</p>
                  <small>
                    {t.required
                      ? 'Required for day one'
                      : 'Optional for day one'}
                  </small>
                  {t.needs.map((n) => (
                    <p key={n.id}>
                      Waiting for {n.title} · {n.owner}
                    </p>
                  ))}
                  {t.approval?.decision === 'declined' && (
                    <p>Request declined. Contact your manager or HR.</p>
                  )}
                  {t.owner.id === profile.userId &&
                    t.status === 'Available' && (
                      <button
                        disabled={busy}
                        className="primary"
                        onClick={() => act('/tasks/' + t.id + '/complete', {})}
                      >
                        Mark complete <Check size={15} />
                      </button>
                    )}
                </div>
              )}
            </article>
          ))}
          {!visibleTasks.length && <p>No {filter.toLowerCase()} tasks.</p>}
        </section>
        <aside>
          <section className="panel next">
            <div className="eyebrow">
              <Compass size={15} /> UP NEXT
            </div>
            <h2>{next?.title || 'All caught up'}</h2>
            <p>{next?.description || 'Your available tasks are complete.'}</p>
            {next && (
              <button
                className="primary"
                disabled={busy}
                onClick={() => act('/tasks/' + next.id + '/complete', {})}
              >
                Mark complete <Check size={15} />
              </button>
            )}
          </section>
          <section className="panel">
            <div className="secthead">
              <LockKeyhole size={18} />
              <h2>Current blockers</h2>
            </div>
            {blocked.length ? (
              blocked.map((t) => (
                <div key={t.id} className="blocker">
                  <strong>{t.title}</strong>
                  <small>
                    {t.needs
                      .map((n) => n.title + ' · ' + n.owner)
                      .join(' / ') || 'Request declined · ' + t.owner.name}
                  </small>
                </div>
              ))
            ) : (
              <p>No tasks are blocked.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}
