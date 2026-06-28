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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="ipsc-eyebrow mb-2">Classificação por stage</div>
          <h1 className="ipsc-h1">{tournament?.name ?? 'Torneio'}</h1>
        </div>
        <Link to={`/tournament/${id}`} className="font-jet cursor-pointer text-[11px] font-semibold uppercase tracking-[0.14em] text-ipsc-muted2 hover:text-ipsc-text">← Geral</Link>
      </div>
      {stages.map(stage => {
        const rows = rankStage(results.filter(r => r.stage === stage))
        return (
          <section key={stage} className="flex flex-col gap-3">
            <h2 className="font-saira-cond text-[22px] font-bold">{tournament?.stage_names[stage - 1] ?? `Stage ${stage}`}</h2>
            {rows.length === 0
              ? <p className="ipsc-label">Sem resultados.</p>
              : (
                <div className="ipsc-panel overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-ipsc-line bg-ipsc-panel text-left">
                        <th className="ipsc-th">POS</th><th className="ipsc-th">ATIRADOR</th><th className="ipsc-th">FATOR</th><th className="ipsc-th text-right">PTS</th>
                        <th className="ipsc-th text-right">TEMPO</th><th className="ipsc-th text-right">HF</th><th className="ipsc-th text-right">PTS STAGE</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.result.id} className="border-b border-[#15180f] last:border-b-0">
                          <td className="ipsc-td font-saira-cond text-[18px] font-bold text-ipsc-accent">{i + 1}</td>
                          <td className="ipsc-td font-semibold">{nameOf(r.player_id)}</td>
                          <td className="ipsc-td font-jet text-[12px] uppercase tracking-[0.1em] text-ipsc-muted2">{r.result.factor === 'major' ? 'Major' : 'Minor'}</td>
                          <td className="ipsc-td font-jet text-right text-[13px]">{r.points}</td>
                          <td className="ipsc-td font-jet text-right text-[13px] text-ipsc-muted2">{r.finalTime.toFixed(2)}s</td>
                          <td className="ipsc-td font-jet text-right text-[13px] text-ipsc-muted2">{r.hitFactor.toFixed(3)}</td>
                          <td className="ipsc-td text-right font-saira-cond text-[18px] font-bold text-ipsc-accent">{r.stagePoints.toFixed(1)}</td>
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
