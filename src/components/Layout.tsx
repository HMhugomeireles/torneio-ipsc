import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const linkBase = 'px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors'
function cls({ isActive }: { isActive: boolean }) {
  return `${linkBase} ${isActive ? 'text-bullet-accent' : 'text-bullet-muted hover:text-bullet-text'}`
}

export function Layout() {
  const { session, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-bullet-dark text-bullet-text font-mono">
      <header className="relative flex flex-wrap items-center gap-1 border-b border-white/10 bg-black/60 px-3 py-2">
        <span className="mr-3 text-lg font-black uppercase tracking-tighter text-bullet-text">TOURNAMENT</span>
        <NavLink to="/" className={cls} end>Home</NavLink>
        <NavLink to="/rules" className={cls}>Rules</NavLink>
        {session && <NavLink to="/score-entry" className={cls}>Score Entry</NavLink>}
        {session && <NavLink to="/manage" className={cls}>Manage</NavLink>}
        <div className="ml-auto">
          {session
            ? <button onClick={signOut} className={`${linkBase} cursor-pointer text-bullet-muted hover:text-red-500`}>Sign out</button>
            : <NavLink to="/login" className={cls}>Sign in</NavLink>}
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-[repeating-linear-gradient(45deg,#d97706,#d97706_15px,transparent_15px,transparent_30px)] opacity-50" />
      </header>
      <main className="mx-auto max-w-3xl p-3"><Outlet /></main>
    </div>
  )
}
