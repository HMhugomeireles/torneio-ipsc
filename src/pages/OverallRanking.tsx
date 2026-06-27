import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { Player, StageResult, Tournament } from '../types'
import * as data from '../lib/data'
import { overallRanking } from '../lib/scoring'

export default function OverallRanking() {
  const { id } = useParams()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [results, setResults] = useState<StageResult[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    if (!id) return
    (async () => {
      setTournament(await data.getTournament(id))
      setResults(await data.getResultsForTournament(id))
      setPlayers(await data.getEnrolledPlayers(id))
    })()
  }, [id])

  const count = tournament?.stage_names.length ?? 0
  const stages = Array.from({ length: count }, (_, i) => i + 1)
  const rows = overallRanking(results, players)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black uppercase tracking-widest">{tournament?.name ?? 'Tournament'}</h1>
        <div className="flex gap-3 text-xs uppercase tracking-widest">
          <Link to="/" className="cursor-pointer text-bullet-muted hover:text-bullet-text">← Championship</Link>
          <Link to={`/tournament/${id}/stages`} className="cursor-pointer text-bullet-accent hover:text-bullet-text">Stage rankings →</Link>
        </div>
      </div>
      {rows.length === 0
        ? <p className="uppercase tracking-widest text-bullet-muted">No players yet.</p>
        : (
          <div className="tactical-panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-bullet-muted">
                  <th className="px-3 py-2">#</th><th className="px-3 py-2">Player</th>
                  {stages.map(n => (
                    <th key={n} className="px-3 py-2 text-right">S{n}</th>
                  ))}
                  <th className="px-3 py-2 text-right text-bullet-accent">Total</th><th className="px-3 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.player_id} className="border-t border-white/10">
                    <td className="px-3 py-2 text-bullet-accent">{i + 1}</td>
                    <td className="px-3 py-2 uppercase tracking-wider">{r.name}</td>
                    {stages.map(n => (
                      <td key={n} className="px-3 py-2 text-right text-bullet-muted">{(r.perStage[n] ?? 0).toFixed(1)}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-bold text-bullet-accent">{r.total.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-bullet-muted">{r.percentLeader.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
