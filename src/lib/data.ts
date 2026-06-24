import { supabase } from './supabase'
import type { Player, Judge, StageResult, StageResultInput, TournamentSettings } from '../types'

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function addPlayer(name: string): Promise<Player> {
  const { data, error } = await supabase.from('players').insert({ name }).select().single()
  if (error) throw error
  return data
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) throw error
}

export async function getJudges(): Promise<Judge[]> {
  const { data, error } = await supabase.from('judges').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function addJudge(name: string): Promise<Judge> {
  const { data, error } = await supabase.from('judges').insert({ name }).select().single()
  if (error) throw error
  return data
}

export async function deleteJudge(id: string): Promise<void> {
  const { error } = await supabase.from('judges').delete().eq('id', id)
  if (error) throw error
}

export async function getSettings(): Promise<TournamentSettings> {
  const { data, error } = await supabase.from('tournament_settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

export async function updateSettings(patch: Partial<TournamentSettings>): Promise<void> {
  const { error } = await supabase.from('tournament_settings').update(patch).eq('id', 1)
  if (error) throw error
}

export async function getResults(): Promise<StageResult[]> {
  const { data, error } = await supabase.from('stage_results').select('*')
  if (error) throw error
  return data ?? []
}

export async function getResult(playerId: string, stage: number): Promise<StageResult | null> {
  const { data, error } = await supabase
    .from('stage_results').select('*')
    .eq('player_id', playerId).eq('stage', stage).maybeSingle()
  if (error) throw error
  return data
}

// Upsert on the (player_id, stage) unique constraint.
export async function saveResult(input: StageResultInput): Promise<void> {
  const { error } = await supabase
    .from('stage_results')
    .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: 'player_id,stage' })
  if (error) throw error
}
