import { useEffect, useState } from 'react'
import type { Player, StageResult, TournamentSettings } from '../types'
import * as data from '../lib/data'
import { overallRanking } from '../lib/scoring'

export default function RankingGeral() {
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

  const rows = overallRanking(results, players)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-black uppercase tracking-widest">Ranking geral</h1>
      {rows.length === 0
        ? <p className="uppercase tracking-widest text-bullet-muted">Ainda não há jogadores.</p>
        : (
          <div className="tactical-panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-bullet-muted">
                  <th className="px-3 py-2">#</th><th className="px-3 py-2">Jogador</th>
                  {[1, 2, 3, 4].map(n => (
                    <th key={n} className="px-3 py-2 text-right">{settings?.stage_names[n - 1]?.replace('Estágio', 'E') ?? `E${n}`}</th>
                  ))}
                  <th className="px-3 py-2 text-right text-bullet-accent">Total</th><th className="px-3 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.player_id} className="border-t border-white/10">
                    <td className="px-3 py-2 text-bullet-accent">{i + 1}</td>
                    <td className="px-3 py-2 uppercase tracking-wider">{r.name}</td>
                    {[1, 2, 3, 4].map(n => (
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
