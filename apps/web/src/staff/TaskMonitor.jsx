import React, { useState } from 'react'
import { Panel, isLate, shortDate } from '../shared/Forms'
export function TaskMonitor({
  tasks,
  filter,
  departments,
  blocked,
  pending,
  user,
  act,
}) {
  const [search, q] = useState(''),
    [dept, department] = useState(''),
    [owner, assignee] = useState(''),
    [state, status] = useState('')
  return (
    <Panel title={filter || 'Task monitoring'}>
      <div className="formgrid">
        <label>
          Employee
          <input value={search} onChange={(e) => q(e.target.value)} />
        </label>
        {[
          ['Department', dept, department, departments],
          [
            'Assignee',
            owner,
            assignee,
            [...new Set(tasks.map((t) => t.owner.name))],
          ],
          [
            'Status',
            state,
            status,
            [
              'Available',
              'Blocked',
              'Complete',
              'Draft',
              'Accepted',
              'Rejected',
            ],
          ],
        ].map(([k, v, fn, opts]) => (
          <label key={k}>
            {k}
            <select value={v} onChange={(e) => fn(e.target.value)}>
              <option value="">All</option>
              {opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {tasks
        .filter(
          (t) =>
            (filter === 'Overdue'
              ? isLate(t) && t.review === 'Approved'
              : filter === 'Blocked'
                ? blocked.some((b) => b.id === t.id)
                : filter === 'Pending'
                  ? pending.some((b) => b.id === t.id)
                  : true) &&
            (!state || t.status === state) &&
            (!dept || dept === t.department) &&
            (!owner || owner === t.owner.name) &&
            t.person.toLowerCase().includes(search.toLowerCase())
        )
        .map((t) => (
          <article key={t.id} className="handoff">
            <strong>
              {t.title} · {t.status}
            </strong>
            <p>
              {t.person} · {t.department} · assigned to {t.owner.name} · due{' '}
              {shortDate(t.due)}
            </p>
            {t.needs.map((n) => (
              <small key={n.id}>
                Waiting for {n.title} · {n.owner}
              </small>
            ))}
            {t.owner.id === user.id &&
              !t.approval &&
              t.status === 'Available' && (
                <button onClick={() => act('/tasks/' + t.id + '/complete', {})}>
                  Mark complete
                </button>
              )}
          </article>
        ))}
    </Panel>
  )
}
