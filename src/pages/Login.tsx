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
    else nav('/registo')
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-16 flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-xl font-bold">Acesso de juiz</h1>
      <input className="rounded bg-neutral-800 p-3" type="email" placeholder="Email"
        value={email} onChange={e => setEmail(e.target.value)} required />
      <input className="rounded bg-neutral-800 p-3" type="password" placeholder="Password"
        value={password} onChange={e => setPassword(e.target.value)} required />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button disabled={busy} className="rounded bg-blue-600 p-3 font-bold disabled:opacity-50">
        {busy ? 'A entrar…' : 'Entrar'}
      </button>
    </form>
  )
}
