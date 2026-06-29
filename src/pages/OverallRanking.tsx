import { Link, useLoaderData, useParams, type LoaderFunctionArgs } from 'react-router-dom'
import * as data from '../lib/data'
import { overallRanking } from '../lib/scoring'

export async function loader({ params }: LoaderFunctionArgs) {
  const id = params.id!
  const [tournament, results, players] = await Promise.all([
    data.getTournament(id),
    data.getResultsForTournament(id),
    data.getEnrolledPlayers(id),
  ])
  return { tournament, results, players }
}

export default function OverallRanking() {
  const { id } = useParams()
  const { tournament, results, players } = useLoaderData() as Awaited<ReturnType<typeof loader>>

  const count = tournament?.stage_names.length ?? 0
  const stages = Array.from({ length: count }, (_, i) => i + 1)
  const rows = overallRanking(results, players)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="ipsc-eyebrow mb-2">Classificação geral</div>
          <h1 className="ipsc-h1">{tournament?.name ?? 'Torneio'}</h1>
        </div>
        <div className="font-jet flex gap-4 text-[11px] font-semibold uppercase tracking-[0.14em]">
          <Link to="/" className="cursor-pointer text-ipsc-muted2 hover:text-ipsc-text">← Campeonato</Link>
          <Link to={`/tournament/${id}/stages`} className="cursor-pointer text-ipsc-accent hover:text-ipsc-text">Stages →</Link>
        </div>
      </div>
      {rows.length === 0
        ? <p className="ipsc-label">Sem atiradores ainda.</p>
        : (
          <div className="ipsc-panel overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ipsc-line bg-ipsc-panel text-left">
                  <th className="ipsc-th">POS</th><th className="ipsc-th">ATIRADOR</th>
                  {stages.map(n => (
                    <th key={n} className="ipsc-th text-right">S{n}</th>
                  ))}
                  <th className="ipsc-th text-right">PONTOS</th><th className="ipsc-th text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.player_id} className="border-b border-[#15180f] last:border-b-0">
                    <td className="ipsc-td font-saira-cond text-[18px] font-bold text-ipsc-accent">{i + 1}</td>
                    <td className="ipsc-td font-semibold">{r.name}</td>
                    {stages.map(n => (
                      <td key={n} className="ipsc-td font-jet text-right text-[13px] text-ipsc-muted2">{(r.perStage[n] ?? 0).toFixed(1)}</td>
                    ))}
                    <td className="ipsc-td text-right font-saira-cond text-[18px] font-bold text-white">{r.total.toFixed(1)}</td>
                    <td className="ipsc-td font-jet text-right text-[13px] text-ipsc-accent">{r.percentLeader.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
