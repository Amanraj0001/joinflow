import React, { useState } from 'react'
import { ArrowRight, MapPin, Users } from 'lucide-react'
import { api } from './api'
import { Handoffs } from './handoffs'
import { History, Notice, Pill } from './shared'
function NewHire({ managers, act, busy, setTab }) {
  async function submit(e) {
    e.preventDefault()
    if (
      await act('/employees', Object.fromEntries(new FormData(e.currentTarget)))
    )
      setTab('Overview')
  }
  return (
    <form className="panel hireform" onSubmit={submit}>
      <h2>Create employee profile</h2>
      <div className="formgrid">
        {[
          ['Full name', 'name', 'text'],
          ['Work email', 'email', 'email'],
          ['Initial password', 'password', 'password'],
          ['Start date', 'startDate', 'date'],
        ].map(([label, name, type]) => (
          <label key={name}>
            {label}
            <input
              name={name}
              type={type}
              minLength={name === 'password' ? 10 : 1}
              required
            />
          </label>
        ))}
        {[
          ['Job role', 'job', ['Engineering', 'Operations']],
          ['Office', 'location', ['London', 'Austin']],
        ].map(([label, name, opts]) => (
          <label key={name}>
            {label}
            <select name={name}>
              {opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Manager
          <select name="managerId" required>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button disabled={busy} className="primary">
        Create checklist <ArrowRight size={16} />
      </button>
    </form>
  )
}
function Change({ p, act, busy }) {
  const [delta, setDelta] = useState(null),
    [err, setErr] = useState(''),
    [loading, setLoading] = useState(false)
  const target = p.location === 'London' ? 'Austin' : 'London'
  async function review() {
    setLoading(true)
    setErr('')
    try {
      setDelta(
        await api('/employees/' + p.id + '/change-preview', {
          location: target,
        })
      )
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="change">
      <button className="secondary" disabled={loading} onClick={review}>
        <MapPin size={14} />
        Preview move to {target}
      </button>
      <Notice value={err} />
      {delta && (
        <div className="changebox">
          <h3>Move to {delta.location}</h3>
          {['added', 'removed', 'retained'].map((k) => (
            <div key={k}>
              <strong>{k}</strong>
              <p>{delta[k].map((t) => t.title).join(', ') || 'None'}</p>
            </div>
          ))}
          <div className="actions">
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await act('/employees/' + p.id + '/apply-change', {
                    location: delta.location,
                    version: delta.version,
                  })
                )
                  setDelta(null)
              }}
            >
              Apply change
            </button>
            <button className="secondary" onClick={() => setDelta(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export function Team({ user, data, tab, act, busy, setTab }) {
  const [selected, setSelected] = useState('')
  const { people, managers, handoffs } = data,
    p = people.find((e) => e.id === selected) || people[0]
  if (tab === 'New hire')
    return <NewHire {...{ managers, act, busy, setTab }} />
  if (tab === 'HR inbox')
    return <Handoffs items={handoffs} {...{ people, act, busy }} />
  const pending = people.flatMap((p) =>
    p.tasks
      .filter((t) => t.approval && !t.approval.decision)
      .map((t) => ({ ...t, person: p.user.name }))
  )
  return (
    <>
      {tab === 'Overview' && (
        <>
          <div className="stats">
            {[
              ['Active hires', people.length],
              ['Pending decisions', pending.length],
              ['Day-one ready', people.filter((e) => e.readiness.ready).length],
            ].map(([k, v]) => (
              <section key={k}>
                <small>{k}</small>
                <b>{v}</b>
              </section>
            ))}
          </div>
          {user.role === 'Manager' && (
            <section className="panel">
              <h2>Pending decisions</h2>
              {pending.length ? (
                pending.map((t) => (
                  <div className="decision" key={t.id}>
                    <div>
                      <strong>{t.title}</strong>
                      <small>
                        {t.person} · {t.category}
                      </small>
                    </div>
                    <div className="actions">
                      {['approved', 'declined'].map((d) => (
                        <button
                          className={d === 'approved' ? 'primary' : 'secondary'}
                          disabled={busy}
                          key={d}
                          onClick={() =>
                            act('/approvals/' + t.approval.id + '/decision', {
                              decision: d,
                            })
                          }
                        >
                          {d === 'approved' ? 'Approve' : 'Decline'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p>All decisions reviewed.</p>
              )}
            </section>
          )}
        </>
      )}
      {p && (
        <section className="panel">
          <div className="secthead">
            <Users size={18} />
            <h2>Employee checklist</h2>
          </div>
          <label>
            Employee
            <select value={p.id} onChange={(e) => setSelected(e.target.value)}>
              {people.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.user.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            {p.job} · {p.location} · {p.readiness.complete}/{p.readiness.total}{' '}
            day-one tasks complete
          </p>
          {user.role === 'HR' && (
            <Change key={p.id + p.version} {...{ p, act, busy }} />
          )}
          {p.tasks.map((t) => (
            <div className="decision" key={t.id}>
              <div>
                <strong>{t.title}</strong>
                <small>
                  {t.owner.name}
                  {t.required ? ' · Day-one requirement' : ''}
                </small>
              </div>
              <Pill value={t.status} />
            </div>
          ))}
        </section>
      )}
      {p && <History events={p.events} />}
    </>
  )
}
