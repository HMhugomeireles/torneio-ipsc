import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { Player, StageResult, Tournament } from '../types'
import * as data from '../lib/data'
import { rankStage } from '../lib/scoring'

export default function StageRankings() {
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

  const nameOf = (pid: string) => players.find(p => p.id === pid)?.name ?? '—'
  const count = tournament?.stage_names.length ?? 0
  const stages = Array.from({ length: count }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black uppercase tracking-widest">{tournament?.name ?? 'Tournament'} — Stages</h1>
        <Link to={`/tournament/${id}`} className="cursor-pointer text-xs uppercase tracking-widest text-bullet-muted hover:text-bullet-text">← Overall</Link>
      </div>
      {stages.map(stage => {
        const rows = rankStage(results.filter(r => r.stage === stage))
        return (
          <section key={stage}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-bullet-accent">{tournament?.stage_names[stage - 1] ?? `Stage ${stage}`}</h2>
            {rows.length === 0
              ? <p className="uppercase tracking-widest text-bullet-muted">No results.</p>
              : (
                <div className="tactical-panel overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-widest text-bullet-muted">
                        <th className="px-3 py-2">#</th><th className="px-3 py-2">Player</th><th className="px-3 py-2">Factor</th><th className="px-3 py-2 text-right">Pts</th>
                        <th className="px-3 py-2 text-right">Time</th><th className="px-3 py-2 text-right">HF</th><th className="px-3 py-2 text-right text-bullet-accent">Stage pts</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.result.id} className="border-t border-white/10">
                          <td className="px-3 py-2 text-bullet-accent">{i + 1}</td>
                          <td className="px-3 py-2 uppercase tracking-wider">{nameOf(r.player_id)}</td>
                          <td className="px-3 py-2 uppercase text-bullet-muted">{r.result.factor === 'major' ? 'Major' : 'Minor'}</td>
                          <td className="px-3 py-2 text-right">{r.points}</td>
                          <td className="px-3 py-2 text-right text-bullet-muted">{r.finalTime.toFixed(2)}s</td>
                          <td className="px-3 py-2 text-right text-bullet-muted">{r.hitFactor.toFixed(3)}</td>
                          <td className="px-3 py-2 text-right font-bold text-bullet-accent">{r.stagePoints.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </section>
        )
      })}
    </div>
  )
}
