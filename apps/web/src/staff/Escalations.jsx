import React, { useState } from 'react'
import { Panel, Field, Form, isLate, shortDate } from '../shared/Forms'
export function Escalations({
  data,
  people,
  risk,
  late,
  blocked,
  hr,
  user,
  act,
}) {
  return (
    <>
      <Panel title="Employees requiring attention">
        {people.filter(risk).map((p) => (
          <p key={p.id}>
            {p.user.name} · {p.readiness.remaining.length} day-one requirements
            open · joins {shortDate(p.startDate)}
          </p>
        ))}
        {[...new Map([...late, ...blocked].map((t) => [t.id, t])).values()].map(
          (t) => (
            <p key={t.id}>
              {t.person} · {t.title} · {isLate(t) ? 'Overdue' : t.status} ·{' '}
              {t.department}
            </p>
          )
        )}
      </Panel>
      {
        <Panel title="Support requests">
          {data.issues.map((i) => (
            <article className="handoff" key={i.id}>
              <strong>
                {people.find((p) => p.id === i.employeeId)?.user.name ||
                  i.employee?.user.name}{' '}
                · {i.category}
              </strong>
              <p>{i.description}</p>
              <small>
                {i.department} · {i.priority} · {i.status}
              </small>
              {i.triage && (
                <p>
                  AI suggestion · {i.triage.department} · {i.triage.priority} ·{' '}
                  {i.triage.reason}
                </p>
              )}
              {i.updates.map((u, n) => (
                <p key={n}>
                  {u.author} · {u.body}
                </p>
              ))}
              <Form
                reset
                label="Update issue"
                submit={(v) => act('/issues/' + i.id + '/update', v)}
              >
                <Field
                  name="department"
                  label="Route to"
                  options={
                    hr
                      ? ['IT', 'People', 'Finance', 'Facilities']
                      : [user.department]
                  }
                  value={i.department}
                />
                <Field
                  name="status"
                  label="Issue status"
                  options={['Open', 'In progress', 'Escalated', 'Resolved']}
                  value={i.status}
                />
                <Field
                  name="body"
                  label="Response to employee"
                  type="textarea"
                />
              </Form>
            </article>
          ))}
        </Panel>
      }
    </>
  )
}
