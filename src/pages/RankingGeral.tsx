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
      <h1 className="text-2xl font-bold">Ranking geral</h1>
      {rows.length === 0
        ? <p className="text-neutral-500">Ainda não há jogadores.</p>
        : (
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr>
                <th>#</th><th>Jogador</th>
                {[1, 2, 3, 4].map(n => (
                  <th key={n} className="text-right">{settings?.stage_names[n - 1]?.replace('Estágio', 'E') ?? `E${n}`}</th>
                ))}
                <th className="text-right">Total</th><th className="text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.player_id} className="border-t border-neutral-800">
                  <td>{i + 1}</td>
                  <td>{r.name}</td>
                  {[1, 2, 3, 4].map(n => (
                    <td key={n} className="text-right">{(r.perStage[n] ?? 0).toFixed(1)}</td>
                  ))}
                  <td className="text-right font-bold">{r.total.toFixed(1)}</td>
                  <td className="text-right">{r.percentLeader.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  )
}
