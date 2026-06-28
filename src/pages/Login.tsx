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
    <form onSubmit={submit} className="ipsc-panel relative mx-auto mt-16 flex max-w-sm flex-col gap-3 overflow-hidden p-6">
      <div className="absolute left-0 top-0 h-[3px] w-full bg-ipsc-accent" />
      <div className="ipsc-eyebrow mt-1">Acesso reservado</div>
      <h1 className="font-saira-cond text-[24px] font-bold text-ipsc-text">Acesso de juiz</h1>
      <input className="ipsc-input" type="email" placeholder="Email"
        value={email} onChange={e => setEmail(e.target.value)} required />
      <input className="ipsc-input" type="password" placeholder="Palavra-passe"
        value={password} onChange={e => setPassword(e.target.value)} required />
      {error && <p className="font-jet rounded border border-red-500/50 bg-red-500/10 p-2 text-[12px] uppercase tracking-[0.1em] text-red-400">{error}</p>}
      <button disabled={busy} className="ipsc-btn mt-1 py-3 text-[13px]">
        {busy ? 'A entrar…' : 'Entrar'}
      </button>
    </form>
  )
}
