import React, { useState } from 'react'
import { Panel, Field, Form } from '../shared/Forms'
export function DocumentReviews({ data, people, act }) {
  return (
    <Panel title="Employee document reviews">
      {data.documents.length === 0 && <p>No documents submitted.</p>}
      {data.documents.map((d) => (
        <article className="handoff" key={d.id}>
          <strong>
            {people.find((p) => p.id === d.employeeId)?.user.name} · {d.kind}
          </strong>
          <p>
            {d.status} ·{' '}
            <a href={'/api/documents/' + d.id + '/download'}>
              Download {d.filename}
            </a>
          </p>
          {d.status === 'Pending Review' && (
            <Form
              label="Submit review"
              submit={(v) =>
                act('/documents/' + d.id + '/review', {
                  ...v,
                  updatedAt: d.updatedAt,
                })
              }
            >
              <Field
                label="Decision"
                name="status"
                options={['Approved', 'Rejected']}
              />
              <Field
                label="Reason (required for rejection)"
                name="reason"
                required={false}
              />
            </Form>
          )}
        </article>
      ))}
    </Panel>
  )
}
