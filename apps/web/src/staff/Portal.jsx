import { EmployeeDirectory } from './EmployeeDirectory'
import { TaskMonitor } from './TaskMonitor'
import { Escalations } from './Escalations'
import { DocumentReviews } from './DocumentReviews'
import { StaffAccess } from './StaffAccess'
import React from 'react'
import { Decisions, NewHire } from './Team'
import { Panel, isLate } from '../shared/Forms'
import { Messages } from '../shared/Messages'
import { Handoffs } from '../shared/Handoffs'
import { Policies } from './Policies'
import { Plans } from './Plans'
export function StaffPortal({ user, data, tab, act, busy, setTab }) {
  const hr = user.role === 'HR',
    { people } = data,
    [page, filter] = tab.split('|')
  const tasks = people.flatMap((p) =>
    p.tasks.map((t) => ({ ...t, person: p.user.name, employeeId: p.id }))
  )
  const active = tasks.filter((t) => t.review === 'Approved'),
    pending = active.filter((t) => t.status !== 'Complete'),
    late = pending.filter(isLate),
    blocked = pending.filter((t) => t.required && t.status === 'Blocked')
  const soon = (p) =>
    new Date(p.startDate) >= new Date(new Date().toISOString().slice(0, 10)) &&
    new Date(p.startDate) - Date.now() < 14 * 86400000
  const risk = (p) =>
    !p.readiness.ready &&
    (new Date(p.startDate) - Date.now() < 7 * 86400000 ||
      p.tasks.some((t) => t.required && (isLate(t) || t.status === 'Blocked')))
  const drafts = (p) =>
    p.plan === 'Draft' ||
    p.tasks.some((t) => ['Accepted', 'Draft'].includes(t.review))
  const decisions = pending.filter((t) => t.approval && !t.approval.decision)
  const history =
    data.history ||
    people
      .flatMap((p) => p.events)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const departments = [...new Set(tasks.map((t) => t.department))]
  if (page === 'New hire')
    return (
      <NewHire
        {...{ managers: data.managers, roles: data.roles, act, busy, setTab }}
      />
    )
  if (page === 'Plans')
    return <Plans initialEmployee={filter} {...{ data, act }} />
  if (page === 'Policies') return <Policies {...{ data, act, user }} />
  if (page === 'Decisions') return <Decisions {...{ data, act, busy }} />
  if (page === 'HR inbox')
    return (
      <>
        <Messages
          contacts={people.map((p) => ({ id: p.id, name: p.user.name }))}
        />
        <Handoffs items={data.handoffs} {...{ people, act, busy }} />
      </>
    )
  if (page === 'Access & roles') return <StaffAccess {...{ data, act }} />
  if (page === 'Documents')
    return <DocumentReviews {...{ data, people, act }} />
  if (page === 'History')
    return (
      <Panel title="Onboarding history">
        {history.map((e) => (
          <article className="event" key={e.id}>
            <div>
              <strong>
                {people.find((p) => p.id === e.employeeId)?.user.name}
              </strong>
              <p>{e.message}</p>
              <small>
                {e.actor.name} · {new Date(e.createdAt).toLocaleString()}
              </small>
            </div>
          </article>
        ))}
      </Panel>
    )
  if (page === 'Escalations')
    return (
      <Escalations {...{ data, people, risk, late, blocked, hr, user, act }} />
    )
  if (page === 'Tasks')
    return (
      <TaskMonitor
        {...{ tasks, filter, departments, blocked, pending, user, act }}
      />
    )
  if (page === 'Employees')
    return <EmployeeDirectory {...{ people, filter, soon, act, busy, hr }} />
  const cards = [
    [
      'Active hires',
      people.filter((p) => !p.readiness.ready).length,
      'Employees|Active',
    ],
    ['Joining soon', people.filter(soon).length, 'Employees|Joining soon'],
    ...(hr
      ? [['Plans awaiting approval', people.filter(drafts).length, 'Plans']]
      : [['Pending decisions', decisions.length, 'Decisions']]),
    ['Pending tasks', pending.length, 'Tasks|Pending'],
    ['Overdue tasks', late.length, 'Tasks|Overdue'],
    ['Critical blockers', blocked.length, 'Tasks|Blocked'],
    ['Requires attention', people.filter(risk).length, 'Escalations'],
    [
      'Day-one ready',
      people.filter((p) => p.readiness.ready).length,
      'Employees|Ready',
    ],
  ]
  return (
    <>
      <div className="stats portalstats">
        {cards.map(([k, v, page]) => (
          <button
            key={k}
            onClick={() => {
              setTab(page)
            }}
          >
            <small>{k}</small>
            <b>{v}</b>
          </button>
        ))}
      </div>
      <Panel title="Department progress">
        {departments.map((d) => {
          const list = active.filter((t) => t.department === d)
          return (
            <p key={d}>
              {d} · {list.filter((t) => t.status === 'Complete').length} /{' '}
              {list.length} complete
            </p>
          )
        })}
      </Panel>
      <Panel title="Recent onboarding activity">
        {history.slice(0, 5).map((e) => (
          <p key={e.id}>
            {e.actor.name} · {e.message}
          </p>
        ))}
        <button className="secondary" onClick={() => setTab('History')}>
          View history
        </button>
      </Panel>
    </>
  )
}
