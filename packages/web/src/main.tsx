import React from 'react'
import { createRoot } from 'react-dom/client'

function apiFetch(path: string, opts: RequestInit = {}) {
  return fetch((import.meta.env.VITE_API_ORIGIN || '/api') + path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts })
}

function Login() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [msg, setMsg] = React.useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (res.ok) {
      setMsg('Logged in')
      window.location.href = '/'
    } else {
      const j = await res.json()
      setMsg(j?.message || 'login failed')
    }
  }
  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit">Login</button>
      </form>
      <div>{msg}</div>
    </div>
  )
}

function Dashboard() {
  const [bots, setBots] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => {
    apiFetch('/bots').then(async (r) => { if (r.ok) setBots(await r.json()); setLoading(false) })
  }, [])
  return (
    <div>
      <h2>Dashboard</h2>
      {loading ? <div>Loading...</div> : (
        <ul>{bots.map(b => <li key={b.id}>{b.name} - {b.active ? 'active' : 'inactive'}</li>)}</ul>
      )}
    </div>
  )
}

function App() {
  const path = window.location.pathname
  if (path === '/login') return <Login />
  return <Dashboard />
}

createRoot(document.getElementById('root')!).render(<App />)
