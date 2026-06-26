import type { Factor, Player, StageResult } from '../types'

const ALPHA = 5
const METAL = 5
const CHARLIE: Record<Factor, number> = { major: 4, minor: 3 }
const DELTA: Record<Factor, number> = { major: 2, minor: 1 }
const PENALTY = 10

export function rawPoints(r: StageResult): number {
  return (
    r.alpha * ALPHA +
    r.charlie * CHARLIE[r.factor] +
    r.delta * DELTA[r.factor] +
    r.metal * METAL
  )
}

export function penaltyCount(r: StageResult): number {
  return r.pen_miss + r.pen_no_shoot + r.pen_safety + r.pen_out_of_zone
}

export function points(r: StageResult): number {
  return Math.max(0, rawPoints(r) - penaltyCount(r) * PENALTY)
}

export function finalTime(r: StageResult): number {
  return r.time_seconds + (r.single_weapon ? r.single_weapon_seconds : 0)
}

export function hitFactor(r: StageResult): number {
  const t = finalTime(r)
  return t > 0 ? points(r) / t : 0
}

export function stagePoints(hf: number, bestHf: number): number {
  return bestHf > 0 ? 100 * (hf / bestHf) : 0
}

export interface StageRow {
  result: StageResult
  player_id: string
  points: number
  finalTime: number
  hitFactor: number
  stagePoints: number
}

export function rankStage(results: StageResult[]): StageRow[] {
  const withHf = results.map(r => ({
    result: r,
    player_id: r.player_id,
    points: points(r),
    finalTime: finalTime(r),
    hitFactor: hitFactor(r),
    stagePoints: 0,
  }))
  const bestHf = withHf.reduce((m, r) => Math.max(m, r.hitFactor), 0)
  for (const row of withHf) row.stagePoints = stagePoints(row.hitFactor, bestHf)
  withHf.sort((a, b) =>
    b.stagePoints - a.stagePoints ||
    b.hitFactor - a.hitFactor ||
    a.finalTime - b.finalTime,
  )
  return withHf
}

export interface OverallRow {
  player_id: string
  name: string
  perStage: Record<number, number>
  total: number
  percentLeader: number
}

export function overallRanking(results: StageResult[], players: Player[]): OverallRow[] {
  const stages = Array.from(new Set(results.map(r => r.stage)))
  const stagePointsByPlayer: Record<string, Record<number, number>> = {}
  for (const stage of stages) {
    const rows = rankStage(results.filter(r => r.stage === stage))
    for (const row of rows) {
      stagePointsByPlayer[row.player_id] ??= {}
      stagePointsByPlayer[row.player_id][stage] = row.stagePoints
    }
  }
  const rows: OverallRow[] = players.map(p => {
    const perStage = stagePointsByPlayer[p.id] ?? {}
    const total = Object.values(perStage).reduce((a, b) => a + b, 0)
    return { player_id: p.id, name: p.name, perStage, total, percentLeader: 0 }
  })
  const maxTotal = rows.reduce((m, r) => Math.max(m, r.total), 0)
  for (const r of rows) r.percentLeader = maxTotal > 0 ? (r.total / maxTotal) * 100 : 0
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  return rows
}
