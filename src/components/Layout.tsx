import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const linkBase = 'px-3 py-2 rounded text-sm font-semibold'
function cls({ isActive }: { isActive: boolean }) {
  return `${linkBase} ${isActive ? 'bg-blue-600 text-white' : 'text-neutral-300'}`
}

export function Layout() {
  const { session, signOut } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-1 border-b border-neutral-800 px-3 py-2">
        <span className="mr-3 font-extrabold">TORNEIO</span>
        <NavLink to="/" className={cls} end>Geral</NavLink>
        <NavLink to="/estagios" className={cls}>Estágios</NavLink>
        <NavLink to="/regras" className={cls}>Regras</NavLink>
        {session && <NavLink to="/registo" className={cls}>Registo</NavLink>}
        {session && <NavLink to="/gestao" className={cls}>Gestão</NavLink>}
        <div className="ml-auto">
          {session
            ? <button onClick={signOut} className={`${linkBase} text-neutral-300`}>Sair</button>
            : <NavLink to="/login" className={cls}>Entrar</NavLink>}
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-3"><Outlet /></main>
    </div>
  )
}
