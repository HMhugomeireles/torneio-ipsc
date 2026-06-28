// Shared presentation helpers for the IPSCAirshuting UI.

export const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
export const fmtDay = (d: string) => { const [, m, day] = d.split('-'); return `${day} ${MONTHS[+m - 1]}` }
export const fmtYear = (d: string) => d.split('-')[0]
export const fmtFull = (d: string) => `${fmtDay(d)} ${fmtYear(d)}`

export const initials = (name: string) =>
  name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()

// Player registration code, e.g. 1 -> "#0001".
export const regCode = (n?: number) => (n == null ? '' : `#${String(n).padStart(4, '0')}`)

export const posColor = (rank: number) =>
  rank === 1 ? '#e8732a' : rank === 2 ? '#c9ccc6' : rank === 3 ? '#b98a55' : '#6b7068'

export type Status = 'done' | 'open' | 'soon'

export const STATUS: Record<Status, { label: string; accent: string; color: string; border: string; bg: string }> = {
  done: { label: 'CONCLUÍDO', accent: '#3a6b4a', color: '#6fae84', border: '#16321f', bg: '#0a1810' },
  open: { label: 'INSCRIÇÕES ABERTAS', accent: '#e8732a', color: '#e8732a', border: '#3a2417', bg: '#170f0a' },
  soon: { label: 'EM BREVE', accent: '#7d94a8', color: '#9aa7b4', border: '#222a30', bg: '#0e1216' },
}

// past → done · soonest upcoming → open · other upcoming → soon
export function statusOf(isPast: boolean, isNext: boolean): Status {
  return isPast ? 'done' : isNext ? 'open' : 'soon'
}

export interface Badge { label: string; accent: string; color: string; border: string; bg: string }

// Enrollment-window badge: open while today is within [start, end], closed
// once past the end, otherwise shows the opening date. Returns null when no
// window is set (caller falls back to the event-date status).
export function enrollmentBadge(enrollStart: string | null, enrollEnd: string | null, today: string): Badge | null {
  if (!enrollStart && !enrollEnd) return null
  if (enrollStart && today < enrollStart)
    return { label: `ABRE ${fmtDay(enrollStart)}`, accent: '#7d94a8', color: '#9aa7b4', border: '#222a30', bg: '#0e1216' }
  if (enrollEnd && today > enrollEnd)
    return { label: 'INSCRIÇÕES FECHADAS', accent: '#3a4138', color: '#9aa09a', border: '#2c322c', bg: '#11140f' }
  return { label: 'INSCRIÇÕES ABERTAS', accent: '#e8732a', color: '#e8732a', border: '#3a2417', bg: '#170f0a' }
}
