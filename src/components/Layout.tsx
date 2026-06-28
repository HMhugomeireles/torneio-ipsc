import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

function Logo({ size = 24 }: { size?: number }) {
  const tick = 'absolute bg-ipsc-accent'
  return (
    <div
      className="relative flex items-center justify-center rounded-full border-2 border-ipsc-accent"
      style={{ width: size, height: size }}
    >
      <div className="h-[3px] w-[3px] rounded-full bg-ipsc-accent" />
      <span className={`${tick} left-1/2 -top-[5px] h-[5px] w-px`} />
      <span className={`${tick} left-1/2 -bottom-[5px] h-[5px] w-px`} />
      <span className={`${tick} top-1/2 -left-[5px] h-px w-[5px]`} />
      <span className={`${tick} top-1/2 -right-[5px] h-px w-[5px]`} />
    </div>
  )
}

function Wordmark({ size = 19 }: { size?: number }) {
  return (
    <span className="font-saira-cond font-bold tracking-[0.06em]" style={{ fontSize: size }}>
      IPSC<span className="text-ipsc-accent">Airshuting</span>
    </span>
  )
}

const navLink = 'font-jet text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors'
function cls({ isActive }: { isActive: boolean }) {
  return `${navLink} ${isActive ? 'text-ipsc-accent' : 'text-ipsc-muted2 hover:text-ipsc-text'}`
}

export function Layout() {
  const { session, signOut } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-ipsc-bg font-saira text-ipsc-text">
      {/* ---------- nav ---------- */}
      <header className="border-b border-ipsc-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-9">
          <Link to="/" className="flex items-center gap-[11px]">
            <Logo />
            <Wordmark />
          </Link>

          <nav className="flex flex-wrap items-center gap-x-7 gap-y-3">
            <Link to="/#ranking" className={`${navLink} text-ipsc-muted2 hover:text-ipsc-text`}>Ranking</Link>
            <NavLink to="/calendario" className={cls}>Calendário</NavLink>
            <NavLink to="/rules" className={cls}>Regras</NavLink>
            {session && <NavLink to="/score-entry" className={cls}>Resultados</NavLink>}
            {session && <NavLink to="/manage" className={cls}>Gerir</NavLink>}

            {session
              ? (
                <button
                  onClick={signOut}
                  className="font-jet cursor-pointer rounded-[3px] border border-ipsc-line2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-ipsc-muted2 transition-colors hover:border-red-500/60 hover:text-red-400"
                >
                  Sair
                </button>
              )
              : (
                <NavLink
                  to="/login"
                  className="font-jet cursor-pointer rounded-[3px] bg-ipsc-accent px-4 py-[9px] text-[12px] font-bold uppercase tracking-[0.16em] text-ipsc-bg transition-colors hover:bg-ipsc-text"
                >
                  Entrar
                </NavLink>
              )}
          </nav>
        </div>
      </header>

      {/* ---------- content ---------- */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-9">
        <Outlet />
      </main>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-ipsc-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 md:px-9">
          <div className="flex items-center gap-[11px]">
            <Logo size={18} />
            <Wordmark size={15} />
          </div>
          <div className="font-jet flex flex-wrap gap-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-ipsc-muted2">
            <Link to="/#ranking" className="hover:text-ipsc-text">Ranking</Link>
            <Link to="/calendario" className="hover:text-ipsc-text">Calendário</Link>
            <Link to="/rules" className="hover:text-ipsc-text">Regras</Link>
          </div>
          <div className="font-jet text-[11px] font-medium uppercase tracking-[0.1em] text-[#5a605a]">
            © 2026 IPSCAirshuting · Temporada 2026
          </div>
        </div>
      </footer>
    </div>
  )
}
