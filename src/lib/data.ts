import { supabase } from './supabase'
import type { Player, Judge, StageResult, StageResultInput, Tournament, TournamentInput } from '../types'

// ---------- Players (global roster) ----------
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

// ---------- Judges (global) ----------
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

// ---------- Tournaments ----------
export async function getTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase.from('tournaments').select('*').order('event_date', { ascending: false })
  if (error) throw error
  return data ?? []
}
export async function getTournament(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase.from('tournaments').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}
export async function addTournament(input: { name: string; event_date: string }): Promise<Tournament> {
  const { data, error } = await supabase.from('tournaments').insert(input).select().single()
  if (error) throw error
  return data
}
export async function updateTournament(id: string, patch: Partial<TournamentInput>): Promise<void> {
  const { error } = await supabase.from('tournaments').update(patch).eq('id', id)
  if (error) throw error
}
export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) throw error
}

// ---------- Enrollment ----------
export async function getEnrolledPlayers(tournamentId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('tournament_players')
    .select('player:players(*)')
    .eq('tournament_id', tournamentId)
  if (error) throw error
  return (data as unknown as { player: Player | null }[] ?? [])
    .map((r) => r.player)
    .filter((p): p is Player => !!p)
    .sort((a, b) => a.name.localeCompare(b.name))
}
export async function enrollPlayer(tournamentId: string, playerId: string): Promise<void> {
  const { error } = await supabase.from('tournament_players')
    .insert({ tournament_id: tournamentId, player_id: playerId })
  if (error) throw error
}
export async function unenrollPlayer(tournamentId: string, playerId: string): Promise<void> {
  const { error } = await supabase.from('tournament_players')
    .delete().eq('tournament_id', tournamentId).eq('player_id', playerId)
  if (error) throw error
}

// ---------- Results ----------
export async function getResultsForTournament(tournamentId: string): Promise<StageResult[]> {
  const { data, error } = await supabase.from('stage_results').select('*').eq('tournament_id', tournamentId)
  if (error) throw error
  return data ?? []
}
export async function getAllResults(): Promise<StageResult[]> {
  const { data, error } = await supabase.from('stage_results').select('*')
  if (error) throw error
  return data ?? []
}
export async function getResult(tournamentId: string, playerId: string, stage: number): Promise<StageResult | null> {
  const { data, error } = await supabase.from('stage_results').select('*')
    .eq('tournament_id', tournamentId).eq('player_id', playerId).eq('stage', stage).maybeSingle()
  if (error) throw error
  return data
}
export async function saveResult(input: StageResultInput): Promise<void> {
  const { error } = await supabase.from('stage_results')
    .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: 'tournament_id,player_id,stage' })
  if (error) throw error
}
export async function getStageResultCount(tournamentId: string, stage: number): Promise<number> {
  const { count, error } = await supabase.from('stage_results')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId).eq('stage', stage)
  if (error) throw error
  return count ?? 0
}
