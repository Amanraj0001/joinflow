import React from 'react'
import { Panel, Form, Field, file64, shortDate, isLate } from '../shared/Forms'
import { Messages } from '../shared/Messages'
import { Handoffs } from '../shared/Handoffs'
import { Chat } from './Assistant'
import { Employee } from './Employee'
export function EmployeePortal({ profile: p, tab, act, busy, setTab }) {
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
  if (tab === 'My Documents')
    return (
      <Panel title="Required documents">
        {p.requiredDocuments.map((kind) => {
          const doc = p.documents.find((d) => d.kind === kind)
          return (
            <article className="handoff" key={kind}>
              <h3>{kind}</h3>
              <p>{doc?.status || 'Awaiting submission'}</p>
              {doc && (
                <a href={'/api/documents/' + doc.id + '/download'}>
                  Download {doc.filename}
                </a>
              )}
              {doc?.reason && <p>HR feedback · {doc.reason}</p>}
              {(!doc || doc.status === 'Rejected') && (
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
        {!notices.length && <p>No updates yet.</p>}
        {notices.map((n) => (
          <article key={n.id} className="decision">
            <div>
              <strong>{n.body}</strong>
              <small>
                {shortDate(n.createdAt)} · {n.read ? 'Read' : 'Unread'}
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
  if (tab === 'Help & Support')
    return (
      <>
        <Messages contacts={p.contacts} />
        <Panel title="Raise an onboarding issue">
          <Form reset label="Create request" submit={(v) => act('/issues', v)}>
            <Field
              label="Category"
              name="category"
              options={[
                'Laptop not received',
                'Document upload',
                'Company email',
                'Access permissions',
                'Payroll',
                'Other',
              ]}
            />
            <Field
              label="Description"
              name="description"
              type="textarea"
              maxLength={3000}
            />
          </Form>
          {p.issues.map((i) => (
            <article className="handoff" key={i.id}>
              <strong>
                {i.category} · {i.status}
              </strong>
              <p>{i.description}</p>
              <small>
                {i.department} · {i.priority} priority
              </small>
              {i.updates.map((u, n) => (
                <p key={n}>
                  {u.author} · {u.body}
                </p>
              ))}
            </article>
          ))}
        </Panel>
        <Handoffs items={p.handoffs} />
      </>
    )
  return (
    <>
      <section className="hero">
        <div>
          <small>ONBOARDING PROGRESS</small>
          <h2>
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
          <progress value={complete} max={tasks.length || 1} />
        </div>
        {navigate('AI Assistant', 'Ask the assistant')}
      </section>
      <div className="stats">
        {[
          ['Completed', complete],
          ['Pending', tasks.length - complete],
          ['Overdue', tasks.filter(isLate).length],
        ].map(([k, n]) => (
          <button
            key={k}
            onClick={() =>
              setTab('My Tasks|' + (k === 'Completed' ? 'Complete' : k))
            }
          >
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
              <p key={t.id}>
                {t.title} · {shortDate(t.due)}
              </p>
            ))}
          {!deadline.some((t) => !isLate(t)) && <p>No upcoming deadlines.</p>}
        </Panel>
        <Panel title="Next action">
          <p>{next?.title || 'No available task right now.'}</p>
          {navigate('My Tasks')}
        </Panel>
      </div>
      <Panel title="Recent notifications">
        {notices.slice(0, 3).map((n) => (
          <p key={n.id}>{n.body}</p>
        ))}
        {navigate('Notifications', 'View all updates')}
      </Panel>
    </>
  )
}
