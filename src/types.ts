export type Factor = 'major' | 'minor'

export interface Player {
  id: string
  name: string
  created_at?: string
}

export interface Judge {
  id: string
  name: string
  created_at?: string
}

export interface TournamentSettings {
  id: number
  stage_names: string[]
  default_single_weapon_seconds: number
}

export interface StageResult {
  id: string
  player_id: string
  judge_id: string
  stage: number // 1..4
  factor: Factor
  alpha: number
  charlie: number
  delta: number
  metal: number
  pen_miss: number
  pen_no_shoot: number
  pen_safety: number
  pen_out_of_zone: number
  time_seconds: number
  single_weapon: boolean
  single_weapon_seconds: number
  created_at?: string
  updated_at?: string
}

// Input shape used when creating/updating a result (no server-managed fields)
export type StageResultInput = Omit<StageResult, 'id' | 'created_at' | 'updated_at'>
