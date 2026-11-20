import React, { useState } from 'react'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Panel, Form, Field, file64, shortDate, isLate } from '../shared/Forms'
import { Tickets } from '../shared/Tickets'
import { Chat } from './Assistant'
import { Employee } from './Employee'
export function EmployeePortal({ profile: p, tab, act, busy, setTab }) {
  const [filter, setFilter] = useState('Unread')
  const [page, target] = tab.split('|')
  const tasks = p.tasks,
    complete = tasks.filter((t) => t.status === 'Complete').length,
    next = tasks.find((t) => t.id === p.next)
  const notices = p.notifications || [],
    deadline = tasks
      .filter((t) => t.due && t.status !== 'Complete')
      .sort((a, b) => a.due.localeCompare(b.due))
  const navigate = (name, label) => (
    <button className="secondary" onClick={() => setTab(name)}>
      {label || name}
    </button>
  )
  if (tab.split('|')[0] === 'My Tasks')
    return (
      <Employee
        key={tab}
        setTab={setTab}
        target={tab.split('|')[2]}
        initialFilter={tab.split('|')[1]}
        profile={p}
        {...{ tab, act, busy }}
      />
    )
  if (tab === 'AI Assistant') return <Chat />
  if (tab === 'My Profile')
    return (
      <Panel title={p.user.name}>
        <p>
          {p.job} · {p.department}
        </p>
        <p>Work email · {p.user.email}</p>
        <p>Personal email · {p.personalEmail || 'Awaiting HR update'}</p>
        <p>Office · {p.location}</p>
        <p>Joining date · {shortDate(p.startDate)}</p>
        <p>Reporting manager · {p.manager.name}</p>
      </Panel>
    )
  if (page === 'My Documents')
    return (
      <Panel title="Required documents">
        {p.requiredDocuments.map((kind) => {
          const doc = p.documents.find((d) => d.kind === kind)
          return (
            <article
              className="handoff"
              key={kind}
              autoFocus={Boolean(target && target === doc?.id)}
              tabIndex={-1}
            >
              <h3>{kind}</h3>
              <p>{doc?.status || 'Awaiting submission'}</p>
              {doc && (
                <a href={'/api/documents/' + doc.id + '/download'}>
                  Download {doc.filename}
                </a>
              )}
              {doc?.reason && <p>HR feedback · {doc.reason}</p>}
              {(!doc ||
                ['Rejected', 'Resubmission Required'].includes(doc.status)) && (
                <Form
                  reset
                  label={doc ? 'Replace document' : 'Submit document'}
                  submit={async ({ file }) =>
                    act('/documents', {
                      kind,
                      filename: file.name,
                      file: await file64(file),
                    })
                  }
                >
                  <Field
                    label="PDF, up to 5 MB"
                    type="file"
                    accept="application/pdf"
                    name="file"
                  />
                </Form>
              )}
            </article>
          )
        })}
      </Panel>
    )
  if (tab === 'Equipment & Access')
    return (
      <Panel title="Equipment and system access">
        {tasks
          .filter((t) => ['Equipment', 'Workplace', 'IT'].includes(t.category))
          .map((t) => (
            <article className="handoff" key={t.id}>
              <strong>{t.title}</strong>
              <p>
                {t.status} · {t.owner.name}
              </p>
              {t.needs.map((n) => (
                <small key={n.id}>
                  Waiting for {n.title} · {n.owner}
                </small>
              ))}
            </article>
          ))}
        {navigate('My Tasks', 'Open checklist')}
      </Panel>
    )
  if (tab === 'Notifications')
    return (
      <Panel title="Updates and reminders">
        <div className="tabs">
          {['Unread', 'Read', 'All'].map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f}
              {f === 'Unread' && ' · ' + notices.filter((n) => !n.read).length}
            </button>
          ))}
        </div>
        <button
          disabled={busy || !notices.some((n) => !n.read)}
          onClick={() => act('/notifications/read-all', {})}
        >
          Mark all as read
        </button>
        {!notices.some(
          (n) => filter === 'All' || n.read === (filter === 'Read'),
        ) && <p>No {filter.toLowerCase()} notifications.</p>}
        {notices
          .filter((n) => filter === 'All' || n.read === (filter === 'Read'))
          .map((n) => (
            <article key={n.id} className="decision">
              <div>
                <button
                  className="link"
                  onClick={async () => {
                    const [type, id] = n.key.split(':')
                    if (
                      !n.read &&
                      !(await act('/notifications/' + n.id + '/read', {}))
                    )
                      return
                    setTab(
                      type === 'document'
                        ? 'My Documents|' + id
                        : type === 'issue'
                          ? 'Help & Support|' + id
                          : type === 'message'
                            ? 'Help & Support|Messages'
                            : 'My Tasks|All|' + id,
                    )
                  }}
                >
                  {n.body}
                </button>
                <small>
                  {new Date(n.createdAt).toLocaleString()} ·{' '}
                  {n.read ? 'Read' : 'Unread'}
                </small>
              </div>
              {!n.read && (
                <button
                  onClick={() => act('/notifications/' + n.id + '/read', {})}
                >
                  Mark read
                </button>
              )}
            </article>
          ))}
      </Panel>
    )
  if (page === 'Help & Support')
    return (
      <Tickets
        key={target}
        target={target}
        issues={p.issues}
        handoffs={p.handoffs}
        contacts={p.contacts}
        act={act}
        busy={busy}
      />
    )
  return (
    <>
      <section className="hero">
        <div>
          <small>YOUR ONBOARDING PROGRESS</small>
          <h2 className="progress-title">
            {tasks.length ? Math.round((100 * complete) / tasks.length) : 0}%
            complete
          </h2>
          <p>
            {p.plan === 'Draft'
              ? 'HR is reviewing your onboarding plan.'
              : p.readiness.ready
                ? 'Ready for day one'
                : p.readiness.remaining.length +
                  ' day-one requirements remaining'}
          </p>
          <progress
            aria-label="Overall onboarding progress"
            value={complete}
            max={tasks.length || 1}
          />
        </div>
        {navigate('AI Assistant', 'Ask the assistant')}
      </section>
      <div className="stats">
        {[
          ['Completed', complete],
          ['Pending', tasks.length - complete],
          ['Overdue', tasks.filter(isLate).length],
        ].map(([k, n], i) => (
          <button
            key={k}
            onClick={() =>
              setTab('My Tasks|' + (k === 'Completed' ? 'Complete' : k))
            }
          >
            {React.createElement([CheckCircle, Clock, AlertCircle][i], {
              size: 20,
            })}
            <small>{k}</small>
            <b>{n}</b>
          </button>
        ))}
      </div>
      <div className="dashboard">
        <Panel title="Upcoming deadlines">
          {deadline
            .filter((t) => !isLate(t))
            .slice(0, 5)
            .map((t) => (
              <p className="timeline-row" key={t.id}>
                <strong>{t.title}</strong>
                <small>
                  {shortDate(t.due)} · {t.owner.name}
                </small>
              </p>
            ))}
          {!deadline.some((t) => !isLate(t)) && <p>No upcoming deadlines.</p>}
        </Panel>
        <Panel title="Next action">
          <p className="recommended">
            {next?.title || 'No available task right now.'}
          </p>
          {navigate(
            next ? 'My Tasks|All|' + next.id : 'My Tasks',
            'Open checklist',
          )}
        </Panel>
      </div>
      <Panel title="Recent notifications">
        {!notices.length && <p>No updates yet.</p>}
        {notices.slice(0, 3).map((n) => (
          <p className="timeline-row" key={n.id}>
            {n.body}
            <small>{shortDate(n.createdAt)}</small>
          </p>
        ))}
        {navigate('Notifications', 'View all updates')}
      </Panel>
    </>
  )
}
