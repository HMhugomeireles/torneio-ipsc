import { useEffect, useState } from 'react'
import type { Player, StageResult, TournamentSettings } from '../types'
import * as data from '../lib/data'
import { rankStage } from '../lib/scoring'

export default function RankingEstagios() {
  const [results, setResults] = useState<StageResult[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [settings, setSettings] = useState<TournamentSettings | null>(null)

  useEffect(() => {
    (async () => {
      setResults(await data.getResults())
      setPlayers(await data.getPlayers())
      setSettings(await data.getSettings())
    })()
  }, [])

  const nameOf = (id: string) => players.find(p => p.id === id)?.name ?? '—'

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-black uppercase tracking-widest">Ranking por estágio</h1>
      {[1, 2, 3, 4].map(stage => {
        const rows = rankStage(results.filter(r => r.stage === stage))
        return (
          <section key={stage}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-bullet-accent">{settings?.stage_names[stage - 1] ?? `Estágio ${stage}`}</h2>
            {rows.length === 0
              ? <p className="uppercase tracking-widest text-bullet-muted">Sem resultados.</p>
              : (
                <div className="tactical-panel overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-widest text-bullet-muted">
                        <th className="px-3 py-2">#</th><th className="px-3 py-2">Jogador</th><th className="px-3 py-2">Fator</th><th className="px-3 py-2 text-right">Pts</th>
                        <th className="px-3 py-2 text-right">Tempo</th><th className="px-3 py-2 text-right">HF</th><th className="px-3 py-2 text-right text-bullet-accent">Pontos est.</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.result.id} className="border-t border-white/10">
                          <td className="px-3 py-2 text-bullet-accent">{i + 1}</td>
                          <td className="px-3 py-2 uppercase tracking-wider">{nameOf(r.player_id)}</td>
                          <td className="px-3 py-2 uppercase text-bullet-muted">{r.result.factor === 'maior' ? 'Maior' : 'Menor'}</td>
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
