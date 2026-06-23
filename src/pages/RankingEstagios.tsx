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
      <h1 className="text-2xl font-bold">Ranking por estágio</h1>
      {[1, 2, 3, 4].map(stage => {
        const rows = rankStage(results.filter(r => r.stage === stage))
        return (
          <section key={stage}>
            <h2 className="mb-2 font-bold">{settings?.stage_names[stage - 1] ?? `Estágio ${stage}`}</h2>
            {rows.length === 0
              ? <p className="text-neutral-500">Sem resultados.</p>
              : (
                <table className="w-full text-sm">
                  <thead className="text-left text-neutral-400">
                    <tr><th>#</th><th>Jogador</th><th>Fator</th><th className="text-right">Pts</th>
                      <th className="text-right">Tempo</th><th className="text-right">HF</th><th className="text-right">Pontos est.</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.result.id} className="border-t border-neutral-800">
                        <td>{i + 1}</td>
                        <td>{nameOf(r.player_id)}</td>
                        <td>{r.result.factor === 'maior' ? 'Maior' : 'Menor'}</td>
                        <td className="text-right">{r.points}</td>
                        <td className="text-right">{r.finalTime.toFixed(2)}s</td>
                        <td className="text-right">{r.hitFactor.toFixed(3)}</td>
                        <td className="text-right font-bold">{r.stagePoints.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </section>
        )
      })}
    </div>
  )
}
