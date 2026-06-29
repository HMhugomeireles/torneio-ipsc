import { useMemo } from 'react'
import { Link, useLoaderData } from 'react-router-dom'
import * as data from '../lib/data'
import { isPast, todayISO } from '../lib/dates'
import { STATUS, enrollmentBadge, fmtFull, fmtYear, statusOf } from '../lib/format'

export async function loader() {
  const ts = await data.getTournaments()
  const counts = await Promise.all(ts.map(async t => [t.id, (await data.getEnrolledPlayers(t.id)).length] as const))
  return { tournaments: ts, shooters: Object.fromEntries(counts) }
}

export default function Calendar() {
  const { tournaments, shooters } = useLoaderData() as Awaited<ReturnType<typeof loader>>

  const today = todayISO()
  const season = tournaments.reduce((y, t) => Math.max(y, +fmtYear(t.event_date)), +fmtYear(today))

  const cards = useMemo(() => {
    const ordered = [...tournaments].sort((a, b) => a.event_date.localeCompare(b.event_date))
    const nextId = ordered.find(t => !isPast(t.event_date, today))?.id
    return ordered.map((t, i) => ({
      t,
      n: String(i + 1).padStart(2, '0'),
      stages: t.stage_names?.length ?? 0,
      shooters: shooters[t.id] ?? 0,
      ...(enrollmentBadge(t.enroll_start, t.enroll_end, today) ?? STATUS[statusOf(isPast(t.event_date, today), t.id === nextId)]),
    }))
  }, [tournaments, shooters, today])

  return (
    <div className="flex flex-col gap-6">
      {/* page header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ipsc-line pb-6">
        <div>
          <div className="ipsc-eyebrow mb-2.5">Calendário de provas</div>
          <h1 className="font-saira-cond text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.005em] md:text-[52px]">Temporada {season}</h1>
        </div>
        <span className="font-jet rounded-[3px] border border-ipsc-line2 bg-ipsc-panel px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#cfd2cc]">Época {season}</span>
      </div>

      {cards.length === 0
        ? <p className="ipsc-label">Sem provas ainda.</p>
        : (
          <div className="grid gap-[18px]">
            {cards.map(c => (
              <div
                key={c.t.id}
                className="overflow-hidden rounded-[6px] border border-ipsc-line bg-ipsc-panel"
                style={{ borderLeft: `3px solid ${c.accent}` }}
              >
                {/* card header */}
                <div className="flex flex-wrap items-center gap-5 border-b border-ipsc-line p-5 md:gap-6 md:p-6">
                  <div className="shrink-0">
                    <div className="font-jet mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5a605a]">Prova</div>
                    <div className="font-saira-cond text-[40px] font-extrabold leading-none md:text-[46px]" style={{ color: c.accent }}>{c.n}</div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h2 className="m-0 font-saira-cond text-[24px] font-bold md:text-[28px]">{c.t.name}</h2>
                      <span
                        className="font-jet whitespace-nowrap rounded-[3px] border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{ color: c.color, borderColor: c.border, background: c.bg }}
                      >
                        {c.label}
                      </span>
                    </div>
                    <div className="font-jet flex flex-wrap gap-x-6 gap-y-1.5 text-[12px] tracking-[0.04em] text-ipsc-muted2">
                      <span>▦ {c.stages} stages</span>
                      <span>◍ {c.shooters}{c.t.capacity != null ? ` / ${c.t.capacity}` : ''} atiradores</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-saira-cond text-[26px] font-bold leading-none text-white md:text-[30px]">{fmtFull(c.t.event_date)}</div>
                    <Link to={`/tournament/${c.t.id}`} className="font-jet mt-2 inline-block cursor-pointer text-[11px] font-semibold uppercase tracking-[0.1em] text-ipsc-muted hover:text-ipsc-accent">Ver detalhes →</Link>
                  </div>
                </div>

                {/* stages grid */}
                <div className="p-5 md:p-6">
                  <div className="ipsc-label mb-3.5">Stages</div>
                  <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                    {c.t.stage_names.map((_name, i) => {
                      const changes = c.t.stage_weapon_changes[i] ?? 0
                      const targets = c.t.stage_targets?.[i] ?? 0
                      return (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-[5px] border border-ipsc-line bg-ipsc-bg p-3.5">
                          <div className="min-w-0">
                            <div className="font-saira-cond text-[18px] font-bold leading-none text-ipsc-text">Stage {String(i + 1).padStart(2, '0')}</div>
                            <div className="font-jet mt-1.5 text-[10px] text-ipsc-muted2">{changes} troca{changes === 1 ? '' : 's'}</div>
                          </div>
                          <span
                            className="font-jet shrink-0 text-[9px] font-bold uppercase tracking-[0.1em]"
                            style={{ color: targets > 0 ? '#e8732a' : '#7a7f7a' }}
                          >
                            {targets} {targets === 1 ? 'alvo' : 'alvos'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
