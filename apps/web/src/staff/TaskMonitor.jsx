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
  const [selected, select] = useState(filter || '')
  const item = tasks.find((t) => t.id === selected)
  const visible = tasks.filter(
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
      t.person.toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <Panel title="Task monitoring">
      <div className="stats">
        {[
          ['Total tasks', tasks.length],
          ['Pending', pending.filter((t) => t.status !== 'In progress').length],
          [
            'In progress',
            tasks.filter((t) => t.status === 'In progress').length,
          ],
          ['Completed', tasks.filter((t) => t.status === 'Complete').length],
          ['Overdue', pending.filter(isLate).length],
        ].map(([k, n]) => (
          <section key={k}>
            <small>{k}</small>
            <b>{n}</b>
          </section>
        ))}
      </div>
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
              'In progress',
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
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                'Task',
                'Employee',
                'Department',
                'Assignee',
                'Due',
                'Status',
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id}>
                <td>
                  <button onClick={() => select(t.id)}>{t.title}</button>
                </td>
                <td>{t.person}</td>
                <td>{t.department}</td>
                <td>{t.owner.name}</td>
                <td>{shortDate(t.due)}</td>
                <td>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && <p>No tasks match these filters.</p>}
      {item && (
        <aside className="task-sheet" aria-label="Task details">
          <button onClick={() => select('')}>Close details</button>
          <h2>{item.title}</h2>
          <p>{item.description}</p>
          <p>
            {item.person} · {item.department} · {item.owner.name}
          </p>
          <p>
            Due {shortDate(item.due)} · {item.status}
          </p>
          <p>
            {item.completedAt && 'Completed ' + shortDate(item.completedAt)}
          </p>
          {item.evidenceKind && <p>Required evidence · {item.evidenceKind}</p>}
          {item.needs.map((n) => (
            <p key={n.id}>
              Waiting for {n.title} · {n.owner}
            </p>
          ))}
          {item.owner.id === user.id &&
            !item.approval &&
            ['In progress', 'Available'].includes(item.status) && (
              <button
                onClick={() => act('/tasks/' + item.id + '/complete', {})}
              >
                Mark complete
              </button>
            )}
          <details>
            <summary>Activity history</summary>
            {item.history.length ? (
              item.history.map((e) => (
                <p key={e.id}>
                  {shortDate(e.createdAt)} · {e.actor.name} · {e.message}
                </p>
              ))
            ) : (
              <p>No task activity recorded yet.</p>
            )}
          </details>
        </aside>
      )}
    </Panel>
  )
}
