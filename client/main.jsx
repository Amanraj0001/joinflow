import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ChevronRight,
  Clock3,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  RefreshCw,
  Users,
} from 'lucide-react'
import { Brand, Notice } from './shared'
import { Login } from './login'
import { Employee } from './employee'
import { Team } from './team'
import './style.css'
import { api } from './api'
function App() {
  const [user, setUser] = useState(null),
    [data, setData] = useState(null),
    [tab, setTab] = useState('Overview'),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function refresh() {
    try {
      const u = await api('/me')
      const d = await api(u.role === 'Employee' ? '/me/checklist' : '/team')
      setUser(u)
      setData(d)
      setError('')
    } catch (e) {
      if (e.status === 401) {
        setUser(null)
        setData(null)
      } else setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    refresh()
  }, [])
  async function act(path, body) {
    setBusy(true)
    setError('')
    try {
      await api(path, body)
      await refresh()
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }
  if (loading)
    return (
      <main className="loading">
        <Brand />
        <p>Loading workspace…</p>
      </main>
    )
  if (!user)
    return error ? (
      <main className="loading">
        <Notice value={error} />
        <button onClick={refresh}>Retry</button>
      </main>
    ) : (
      <Login refresh={refresh} />
    )
  const nav =
    user.role === 'Employee'
      ? ['Overview', 'Assistant', 'HR replies', 'Activity']
      : user.role === 'HR'
        ? ['Overview', 'New hire', 'HR inbox']
        : ['Overview', 'Activity']
  const icons = {
    Overview: LayoutDashboard,
    Assistant: MessageCircle,
    Activity: Clock3,
    'New hire': Users,
    'HR inbox': MessageCircle,
    'HR replies': MessageCircle,
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <div className="eyebrow">WORKSPACE</div>
        <nav>
          {nav.map((n) => {
            const Icon = icons[n]
            return (
              <button
                key={n}
                className={tab === n ? 'current' : ''}
                onClick={() => {
                  setTab(n)
                  setError('')
                  if (n === 'HR replies' || n === 'HR inbox') refresh()
                }}
              >
                <Icon size={18} />
                {n}
              </button>
            )
          })}
        </nav>
        <div className="account">
          <span className="avatar">
            {user.name
              .split(' ')
              .map((s) => s[0])
              .join('')}
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
          <button
            title="Sign out"
            aria-label="Sign out"
            onClick={async () => {
              if (await act('/auth/logout', {})) setTab('Overview')
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header>
          <span>
            Workspace <ChevronRight size={13} /> {tab}
          </span>
          <button onClick={refresh}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </header>
        <div className="content">
          <div className="eyebrow">{user.role.toUpperCase()} WORKSPACE</div>
          <h1>
            {tab === 'Overview'
              ? user.role === 'Employee'
                ? 'Welcome, ' + user.name.split(' ')[0]
                : user.role === 'HR'
                  ? 'People overview'
                  : 'Team approvals'
              : tab}
          </h1>
          <p className="subtitle">
            {user.role === 'Employee'
              ? data.job +
                ' · ' +
                data.location +
                ' · Starts ' +
                new Date(data.startDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                })
              : user.role === 'HR'
                ? 'Manage onboarding, employee changes, and HR questions.'
                : 'Review decisions and follow your team’s onboarding progress.'}
          </p>
          <Notice value={error} />
          {user.role === 'Employee' ? (
            <Employee profile={data} {...{ act, tab, busy }} />
          ) : (
            <Team {...{ user, data, tab, act, busy, setTab }} />
          )}
        </div>
      </main>
    </div>
  )
}
createRoot(document.getElementById('root')).render(<App />)
