import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(error)
    else nav('/score-entry')
  }

  return (
    <form onSubmit={submit} className="tactical-panel relative mx-auto mt-16 flex max-w-sm flex-col gap-3 p-6">
      <div className="absolute top-0 left-0 h-1.5 w-full bg-[repeating-linear-gradient(-45deg,#d97706,#d97706_10px,#0f1216_10px,#0f1216_20px)] opacity-50" />
      <h1 className="mt-2 text-xl font-black uppercase tracking-widest text-bullet-text">Judge access</h1>
      <input className="tactical-input normal-case" type="email" placeholder="Email"
        value={email} onChange={e => setEmail(e.target.value)} required />
      <input className="tactical-input" type="password" placeholder="Password"
        value={password} onChange={e => setPassword(e.target.value)} required />
      {error && <p className="border border-red-500 bg-red-500/10 p-2 text-sm uppercase tracking-widest text-red-500">{error}</p>}
      <button disabled={busy}
        className="relative cursor-pointer overflow-hidden bg-bullet-accent p-3 font-bold uppercase tracking-[0.2em] text-bullet-dark transition-colors duration-300 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        style={{ clipPath: 'polygon(4% 0, 100% 0, 100% 70%, 96% 100%, 0 100%, 0 30%)' }}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
