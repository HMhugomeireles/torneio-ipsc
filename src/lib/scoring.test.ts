import { describe, it, expect } from 'vitest'
import {
  rawPoints, penaltyCount, points, finalTime, hitFactor, stagePoints,
  rankStage, overallRanking, championshipRanking,
} from './scoring'
import type { StageResult, Player } from '../types'

function make(partial: Partial<StageResult>): StageResult {
  return {
    id: 'x', player_id: 'p', judge_id: 'j', stage: 1, factor: 'major',
    alpha: 0, charlie: 0, delta: 0, metal: 0,
    pen_miss: 0, pen_no_shoot: 0, pen_safety: 0, pen_out_of_zone: 0,
    time_seconds: 10, single_weapon: false, single_weapon_seconds: 0,
    ...partial,
  }
}

describe('rawPoints', () => {
  it('scores zones with MAJOR FACTOR (A5 C4 D2, metal 5)', () => {
    const r = make({ factor: 'major', alpha: 2, charlie: 1, delta: 1, metal: 1 })
    expect(rawPoints(r)).toBe(21)
  })
  it('scores zones with MINOR FACTOR (A5 C3 D1, metal 5)', () => {
    const r = make({ factor: 'minor', alpha: 2, charlie: 1, delta: 1, metal: 1 })
    expect(rawPoints(r)).toBe(19)
  })
})

describe('penaltyCount', () => {
  it('sums all penalty categories', () => {
    const r = make({ pen_miss: 1, pen_no_shoot: 2, pen_safety: 1, pen_out_of_zone: 1 })
    expect(penaltyCount(r)).toBe(5)
  })
})

describe('points', () => {
  it('subtracts 10 per penalty from raw points', () => {
    const r = make({ factor: 'major', alpha: 4, pen_miss: 1 })
    expect(points(r)).toBe(10)
  })
  it('never goes below zero', () => {
    const r = make({ factor: 'major', alpha: 1, pen_miss: 1 })
    expect(points(r)).toBe(0)
  })
})

describe('finalTime', () => {
  it('returns raw time when not single weapon', () => {
    expect(finalTime(make({ time_seconds: 34.2 }))).toBeCloseTo(34.2)
  })
  it('adds single weapon seconds when enabled', () => {
    const r = make({ time_seconds: 34.2, single_weapon: true, single_weapon_seconds: 20 })
    expect(finalTime(r)).toBeCloseTo(54.2)
  })
  it('ignores single weapon seconds when disabled', () => {
    const r = make({ time_seconds: 34.2, single_weapon: false, single_weapon_seconds: 20 })
    expect(finalTime(r)).toBeCloseTo(34.2)
  })
})

describe('hitFactor', () => {
  it('is points divided by final time', () => {
    const r = make({ factor: 'major', alpha: 8, time_seconds: 20 })
    expect(hitFactor(r)).toBeCloseTo(2)
  })
  it('is 0 when final time is 0', () => {
    expect(hitFactor(make({ alpha: 8, time_seconds: 0 }))).toBe(0)
  })
})

describe('stagePoints', () => {
  it('gives 100 to the best HF', () => {
    expect(stagePoints(2.0, 2.0)).toBeCloseTo(100)
  })
  it('scales proportionally below the best', () => {
    expect(stagePoints(1.0, 2.0)).toBeCloseTo(50)
  })
  it('is 0 when best HF is 0', () => {
    expect(stagePoints(0, 0)).toBe(0)
  })
})

describe('rankStage', () => {
  it('computes HF + stage points and sorts best first', () => {
    const a = make({ id: 'a', player_id: 'A', alpha: 8, time_seconds: 20 })
    const b = make({ id: 'b', player_id: 'B', alpha: 8, time_seconds: 40 })
    const rows = rankStage([b, a])
    expect(rows.map(r => r.player_id)).toEqual(['A', 'B'])
    expect(rows[0].stagePoints).toBeCloseTo(100)
    expect(rows[1].stagePoints).toBeCloseTo(50)
  })
  it('breaks HF ties by lower final time', () => {
    const a = make({ id: 'a', player_id: 'A', alpha: 4, time_seconds: 10 })
    const b = make({ id: 'b', player_id: 'B', alpha: 8, time_seconds: 20 })
    const rows = rankStage([a, b])
    expect(rows[0].player_id).toBe('A')
  })
})

describe('overallRanking', () => {
  it('sums stage points per player across stages and ranks', () => {
    const players: Player[] = [{ id: 'A', name: 'Ana' }, { id: 'B', name: 'Bea' }]
    const s1a = make({ id: '1a', player_id: 'A', stage: 1, alpha: 8, time_seconds: 20 })
    const s1b = make({ id: '1b', player_id: 'B', stage: 1, alpha: 8, time_seconds: 40 })
    const s2a = make({ id: '2a', player_id: 'A', stage: 2, alpha: 8, time_seconds: 40 })
    const s2b = make({ id: '2b', player_id: 'B', stage: 2, alpha: 8, time_seconds: 20 })
    const rows = overallRanking([s1a, s1b, s2a, s2b], players)
    expect(rows[0].total).toBeCloseTo(150)
    expect(rows[0].percentLeader).toBeCloseTo(100)
    expect(rows.find(r => r.player_id === 'A')!.perStage[1]).toBeCloseTo(100)
  })
  it('includes players with no results as zero', () => {
    const players: Player[] = [{ id: 'A', name: 'Ana' }, { id: 'C', name: 'Carl' }]
    const s1a = make({ id: '1a', player_id: 'A', stage: 1, alpha: 8, time_seconds: 20 })
    const rows = overallRanking([s1a], players)
    const carl = rows.find(r => r.player_id === 'C')!
    expect(carl.total).toBe(0)
    expect(carl.percentLeader).toBe(0)
  })
})

describe('championshipRanking', () => {
  it('sums each player\'s per-tournament overall totals across tournaments', () => {
    const playersA = [{ id: 'A', name: 'Ana' }, { id: 'B', name: 'Bea' }]
    const playersB = [{ id: 'A', name: 'Ana' }, { id: 'C', name: 'Carl' }]
    const t1 = [
      make({ id: 't1a', player_id: 'A', stage: 1, alpha: 8, time_seconds: 20 }),
      make({ id: 't1b', player_id: 'B', stage: 1, alpha: 8, time_seconds: 40 }),
    ]
    const t2 = [
      make({ id: 't2c', player_id: 'C', stage: 1, alpha: 8, time_seconds: 20 }),
      make({ id: 't2a', player_id: 'A', stage: 1, alpha: 8, time_seconds: 40 }),
    ]
    const rows = championshipRanking([
      { results: t1, players: playersA },
      { results: t2, players: playersB },
    ])
    const byId = Object.fromEntries(rows.map(r => [r.player_id, r]))
    expect(byId['A'].total).toBeCloseTo(150)
    expect(byId['B'].total).toBeCloseTo(50)
    expect(byId['C'].total).toBeCloseTo(100)
    expect(rows[0].player_id).toBe('A')
    expect(byId['A'].percentLeader).toBeCloseTo(100)
    expect(byId['B'].percentLeader).toBeCloseTo(33.333, 2)
  })

  it('returns [] for no entries', () => {
    expect(championshipRanking([])).toEqual([])
  })

  it('counts a player appearing in only one tournament', () => {
    const rows = championshipRanking([
      { results: [make({ id: 'x', player_id: 'A', stage: 1, alpha: 8, time_seconds: 20 })],
        players: [{ id: 'A', name: 'Ana' }] },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].total).toBeCloseTo(100)
    expect(rows[0].percentLeader).toBeCloseTo(100)
  })
})
