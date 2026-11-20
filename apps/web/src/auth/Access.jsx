import React, { useState } from 'react'
import { Field, Form } from '../shared/Forms'
import { api } from '../shared/api'
export function Access({ mode, back }) {
  const [message, setMessage] = useState('')
  return (
    <section>
      <button onClick={back}>← Back to sign in</button>
      <h2>
        {mode === 'register'
          ? 'Request staff access'
          : mode === 'reset'
            ? 'Choose a password'
            : 'Forgot password'}
      </h2>
      {message ? (
        <p role="status">{message}</p>
      ) : (
        <Form
          label={
            mode === 'register'
              ? 'Request approval'
              : mode === 'reset'
                ? 'Save password'
                : 'Send reset link'
          }
          submit={async (v) => {
            if (mode === 'register') {
              await api('/auth/register', v)
              setMessage('Your account is awaiting manager approval.')
            } else if (mode === 'reset') {
              await api('/auth/reset', { ...v, token: location.hash.slice(7) })
              history.replaceState(null, '', location.pathname)
              setMessage('Password saved. Return to sign in.')
            } else {
              await api('/auth/forgot', v)
              setMessage(
                'If this employee account has a personal email, a reset link will be sent there.'
              )
            }
          }}
        >
          {mode === 'register' && (
            <>
              <Field label="Full name" name="name" />
              <Field
                label="Access role"
                name="role"
                options={['HR', 'Manager']}
              />
              <Field
                label="Department"
                name="department"
                options={['People', 'IT', 'Finance', 'Facilities']}
              />
            </>
          )}
          {mode !== 'reset' && (
            <Field label="Work email" name="email" type="email" />
          )}
          {mode !== 'forgot' && (
            <Field
              label="Password"
              name="password"
              type="password"
              minLength={10}
              maxLength={72}
            />
          )}
        </Form>
      )}
    </section>
  )
}
