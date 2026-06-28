export type Factor = 'major' | 'minor'

export interface Player {
  id: string
  reg_no?: number // unique sequential registration number, shown as #0001
  name: string
  created_at?: string
}

export interface Judge {
  id: string
  name: string
  created_at?: string
}

export type EnrollmentStatus = 'provisional' | 'confirmed'

export interface Enrollment {
  player: Player
  status: EnrollmentStatus
}

export interface Tournament {
  id: string
  name: string
  event_date: string // 'YYYY-MM-DD'
  enroll_start: string | null // 'YYYY-MM-DD' — enrollment opens
  enroll_end: string | null // 'YYYY-MM-DD' — enrollment closes
  stage_names: string[]
  single_weapon_seconds_per_change: number
  stage_weapon_changes: number[] // parallel to stage_names; index i = weapon changes for stage i+1
  created_at?: string
}

// Fields editable when creating/updating a tournament (no server-managed fields)
export type TournamentInput = Omit<Tournament, 'id' | 'created_at'>

export interface StageResult {
  id: string
  tournament_id: string
  player_id: string
  judge_id: string
  stage: number // 1..n
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
