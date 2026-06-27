import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Tournament } from '../types'
import * as data from '../lib/data'
import { championshipRanking, type ChampionshipRow } from '../lib/scoring'
import { isPast, todayISO } from '../lib/dates'

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [champRows, setChampRows] = useState<ChampionshipRow[]>([])

  useEffect(() => {
    (async () => {
      const ts = await data.getTournaments()
      setTournaments(ts)
      const all = await data.getAllResults()
      const entries = await Promise.all(
        ts.map(async t => ({
          results: all.filter(r => r.tournament_id === t.id),
          players: await data.getEnrolledPlayers(t.id),
        })),
      )
      setChampRows(championshipRanking(entries))
    })()
  }, [])

  const today = todayISO()

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-black uppercase tracking-widest">Championship</h1>
        {champRows.length === 0
          ? <p className="uppercase tracking-widest text-bullet-muted">No results yet.</p>
          : (
            <div className="tactical-panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-bullet-muted">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2 text-right text-bullet-accent">Total</th>
                    <th className="px-3 py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {champRows.map((r, i) => (
                    <tr key={r.player_id} className="border-t border-white/10">
                      <td className="px-3 py-2 text-bullet-accent">{i + 1}</td>
                      <td className="px-3 py-2 uppercase tracking-wider">{r.name}</td>
                      <td className="px-3 py-2 text-right font-bold text-bullet-accent">{r.total.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right text-bullet-muted">{r.percentLeader.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-bullet-accent">Tournaments</h2>
        {tournaments.length === 0
          ? <p className="uppercase tracking-widest text-bullet-muted">No tournaments yet.</p>
          : (
            <div className="grid gap-2">
              {tournaments.map(t => (
                <Link key={t.id} to={`/tournament/${t.id}`}
                  className="tactical-panel flex items-center justify-between p-3 transition-colors hover:border-bullet-accent cursor-pointer">
                  <span className="font-bold uppercase tracking-wider">{t.name}</span>
                  <span className="flex items-center gap-3 text-xs uppercase tracking-widest">
                    <span className="text-bullet-muted">{t.event_date}</span>
                    <span className={isPast(t.event_date, today) ? 'text-bullet-muted' : 'text-bullet-accent'}>
                      {isPast(t.event_date, today) ? 'Past' : 'Upcoming'}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
      </section>
    </div>
  )
}
