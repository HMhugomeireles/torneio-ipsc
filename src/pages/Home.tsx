import { useEffect, useMemo } from 'react'
import { Link, useLoaderData, useLocation } from 'react-router-dom'
import * as data from '../lib/data'
import { championshipRanking, type ChampionshipRow } from '../lib/scoring'
import { isPast, todayISO } from '../lib/dates'
import { STATUS, enrollmentBadge, fmtDay, fmtFull, fmtYear, initials, posColor, statusOf } from '../lib/format'

const MEDAL: Record<number, { medal: string; cardBg: string; cardBorder: string; ghost: string; place: string }> = {
  1: { medal: '#e8732a', cardBg: '#16110b', cardBorder: '#3a2417', ghost: '#241710', place: '1.º LUGAR' },
  2: { medal: '#c9ccc6', cardBg: '#121512', cardBorder: '#23281f', ghost: '#1b1f19', place: '2.º LUGAR' },
  3: { medal: '#b98a55', cardBg: '#15120c', cardBorder: '#2a2114', ghost: '#1f1910', place: '3.º LUGAR' },
}

const label = 'font-jet font-semibold uppercase'

export async function loader() {
  const ts = await data.getTournaments()
  const all = await data.getAllResults()
  const entries = await Promise.all(
    ts.map(async t => ({ t, players: await data.getEnrolledPlayers(t.id), results: all.filter(r => r.tournament_id === t.id) })),
  )
  const champRows = championshipRanking(entries.map(e => ({ results: e.results, players: e.players })))
  const shooters = Object.fromEntries(entries.map(e => [e.t.id, e.players.length]))
  const stagesByPlayer: Record<string, number> = {}
  for (const r of all) stagesByPlayer[r.player_id] = (stagesByPlayer[r.player_id] ?? 0) + 1
  return { tournaments: ts, champRows, shooters, stagesByPlayer }
}

export default function Home() {
  const { tournaments, champRows, shooters, stagesByPlayer } = useLoaderData() as Awaited<ReturnType<typeof loader>>
  const { hash } = useLocation()

  // Scroll to #ranking / #calendario when navigated to via the nav links.
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  const today = todayISO()
  const season = tournaments.reduce((y, t) => Math.max(y, +fmtYear(t.event_date)), +fmtYear(today))

  const { stats, calendar } = useMemo(() => {
    const totalStages = tournaments.reduce((a, t) => a + (t.stage_names?.length ?? 0), 0)
    const totalShooters = Object.values(shooters).reduce((a, b) => a + b, 0)
    const ordered = [...tournaments].sort((a, b) => a.event_date.localeCompare(b.event_date))
    const past = tournaments.filter(t => isPast(t.event_date, today))
    const upcoming = ordered.filter(t => !isPast(t.event_date, today))
    const nextId = upcoming[0]?.id
    const nextDate = upcoming[0]?.event_date

    const calendar = ordered.map((t, i) => ({
      t,
      n: String(i + 1).padStart(2, '0'),
      stages: t.stage_names?.length ?? 0,
      shooters: shooters[t.id] ?? 0,
      ...(enrollmentBadge(t.enroll_start, t.enroll_end, today) ?? STATUS[statusOf(isPast(t.event_date, today), t.id === nextId)]),
    }))

    const stats = [
      { label: 'PROVAS REALIZADAS', value: String(past.length), unit: `/ ${tournaments.length} na época`, color: '#fff' },
      { label: 'TOTAL DE STAGES', value: String(totalStages), unit: 'stages', color: '#fff' },
      { label: 'PARTICIPAÇÕES', value: String(totalShooters), unit: 'atiradores', color: '#fff' },
      { label: 'ATLETAS NO RANKING', value: String(champRows.length), unit: 'ativos', color: '#fff' },
      { label: 'PRÓXIMA PROVA', value: nextDate ? fmtDay(nextDate) : '—', unit: nextDate ? fmtYear(nextDate) : '', color: '#e8732a' },
    ]
    return { stats, calendar }
  }, [tournaments, shooters, champRows, today])

  const podium = useMemo(() => {
    const top = champRows.slice(0, 3)
    const order = [top[1], top[0], top[2]] // 2nd · 1st · 3rd
    return order
      .map((p, idx) => p && { ...p, rank: idx === 0 ? 2 : idx === 1 ? 1 : 3 })
      .filter((p): p is ChampionshipRow & { rank: number } => !!p)
      .map(p => ({ ...p, ...MEDAL[p.rank], stagesDone: stagesByPlayer[p.player_id] ?? 0 }))
  }, [champRows, stagesByPlayer])

  return (
    <div className="flex flex-col gap-9">
      {/* ---------- stats bar ---------- */}
      <div className="grid grid-cols-2 overflow-hidden rounded-md border-b border-l border-ipsc-line md:grid-cols-5">
        {stats.map(s => (
          <div key={s.label} className="border-r border-t border-ipsc-line px-5 py-5 md:border-t-0">
            <div className={`${label} mb-3 text-[10px] tracking-[0.16em] text-ipsc-muted`}>{s.label}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-saira-cond text-[26px] font-bold leading-none md:text-[30px]" style={{ color: s.color }}>{s.value}</span>
              <span className="font-jet text-[11px] font-medium text-ipsc-muted">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- calendário ---------- */}
      <section id="calendario" className="scroll-mt-24 flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className={`${label} mb-2 text-[11px] tracking-[0.2em] text-ipsc-accent`}>Calendário de provas</div>
            <h2 className="m-0 font-saira-cond text-[28px] font-bold tracking-[0.01em] md:text-[30px]">Temporada {season}</h2>
          </div>
          <Link to="/calendario" className="font-jet rounded-[3px] border border-ipsc-line2 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ipsc-muted2 transition-colors hover:text-ipsc-text">Ver tudo</Link>
        </div>

        {calendar.length === 0
          ? <p className={`${label} text-[12px] tracking-[0.12em] text-ipsc-muted`}>Sem provas ainda.</p>
          : (
            <div className="grid gap-3">
              {calendar.map(c => (
                <Link
                  key={c.t.id}
                  to={`/tournament/${c.t.id}`}
                  className="grid grid-cols-[44px_1fr_auto] items-center gap-4 rounded-[5px] border border-ipsc-line bg-ipsc-panel px-5 py-4 transition-colors hover:border-ipsc-line2 md:grid-cols-[70px_1fr_auto_auto] md:gap-[22px]"
                  style={{ borderLeft: `3px solid ${c.accent}` }}
                >
                  <div className="font-saira-cond text-[26px] font-extrabold text-ipsc-line2 md:text-[32px]">{c.n}</div>
                  <div className="min-w-0">
                    <div className="truncate font-saira-cond text-[18px] font-bold md:text-[20px]">{c.t.name}</div>
                    <div className="font-jet mt-1 text-[11px] tracking-[0.04em] text-ipsc-muted">{fmtFull(c.t.event_date)}</div>
                  </div>
                  <div className="hidden text-right md:block">
                    <div className="font-jet text-[13px] font-semibold text-[#cfd2cc]">{fmtFull(c.t.event_date)}</div>
                    <div className="font-jet mt-1 text-[11px] font-medium text-ipsc-muted">{c.stages} STAGES · {c.shooters}{c.t.capacity != null ? ` / ${c.t.capacity}` : ''} ATIRADORES</div>
                  </div>
                  <span
                    className="font-jet justify-self-end whitespace-nowrap rounded-[3px] border px-[11px] py-[7px] text-[10px] font-bold tracking-[0.14em]"
                    style={{ color: c.color, borderColor: c.border, background: c.bg }}
                  >
                    {c.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
      </section>

      {/* ---------- ranking ---------- */}
      <section id="ranking" className="scroll-mt-24 flex flex-col gap-5">
        <div>
          <div className={`${label} mb-2 text-[11px] tracking-[0.2em] text-ipsc-accent`}>Classificação geral</div>
          <h2 className="m-0 font-saira-cond text-[28px] font-bold tracking-[0.01em] md:text-[30px]">Ranking da Temporada</h2>
        </div>

        {champRows.length === 0
          ? <p className={`${label} text-[12px] tracking-[0.12em] text-ipsc-muted`}>Sem resultados ainda.</p>
          : (
            <>
              {/* podium */}
              <div className="grid grid-cols-1 items-end gap-3.5 md:grid-cols-3">
                {podium.map(p => (
                  <div
                    key={p.player_id}
                    className="relative overflow-hidden rounded-[5px] border px-[18px] py-5"
                    style={{ background: p.cardBg, borderColor: p.cardBorder }}
                  >
                    <div className="absolute right-3.5 top-2.5 font-saira-cond text-[54px] font-extrabold leading-none" style={{ color: p.ghost }}>{p.rank}</div>
                    <div className={`${label} mb-3.5 text-[11px] tracking-[0.16em]`} style={{ color: p.medal }}>{p.place}</div>
                    <div className="mb-0.5 font-saira-cond text-[23px] font-bold leading-[1.05]">{p.name}</div>
                    <div className="mb-4 flex items-baseline gap-1.5">
                      <span className="font-jet text-[13px] font-semibold text-[#cfd2cc]">{p.stagesDone}</span>
                      <span className="font-jet text-[12px] font-medium text-ipsc-muted">stages na época</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-saira-cond text-[28px] font-bold" style={{ color: p.medal }}>{p.total.toFixed(1)}</span>
                      <span className="font-jet text-[12px] font-medium text-ipsc-muted2">{p.percentLeader.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* table */}
              <div className="overflow-hidden rounded-[5px] border border-ipsc-line">
                <div className="grid grid-cols-[44px_1fr_80px_64px] items-center gap-2 border-b border-ipsc-line bg-ipsc-panel px-5 py-3 md:grid-cols-[64px_1fr_120px_130px_110px]">
                  <span className={`${label} text-[11px] tracking-[0.16em] text-ipsc-muted`}>POS</span>
                  <span className={`${label} text-[11px] tracking-[0.16em] text-ipsc-muted`}>ATIRADOR</span>
                  <span className={`${label} hidden text-right text-[11px] tracking-[0.16em] text-ipsc-muted md:block`}>STAGES</span>
                  <span className={`${label} text-right text-[11px] tracking-[0.16em] text-ipsc-muted`}>PONTOS</span>
                  <span className={`${label} text-right text-[11px] tracking-[0.16em] text-ipsc-muted`}>%</span>
                </div>
                {champRows.map((r, i) => {
                  const rank = i + 1
                  return (
                    <div
                      key={r.player_id}
                      className="grid grid-cols-[44px_1fr_80px_64px] items-center gap-2 border-b border-[#15180f] px-5 py-3.5 transition-colors last:border-b-0 hover:bg-ipsc-panel md:grid-cols-[64px_1fr_120px_130px_110px]"
                    >
                      <span className="font-saira-cond text-[18px] font-bold" style={{ color: posColor(rank) }}>{rank}</span>
                      <div className="flex items-center gap-3">
                        <div className="font-jet flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-[#262b22] bg-[#1a1e18] text-[11px] font-semibold text-ipsc-muted2">{initials(r.name)}</div>
                        <span className="truncate text-[16px] font-semibold text-ipsc-text">{r.name}</span>
                      </div>
                      <span className="font-jet hidden text-right text-[13px] font-medium text-ipsc-muted2 md:block">{stagesByPlayer[r.player_id] ?? 0}</span>
                      <span className="font-saira-cond text-right text-[18px] font-bold text-white">{r.total.toFixed(1)}</span>
                      <span className="font-jet text-right text-[13px] font-medium text-ipsc-accent">{r.percentLeader.toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
      </section>
    </div>
  )
}
