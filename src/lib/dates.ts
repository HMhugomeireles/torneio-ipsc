// ISO 'YYYY-MM-DD' strings compare lexicographically in date order.
export function isPast(eventDate: string, today: string): boolean {
  return eventDate < today
}

// Today's date as 'YYYY-MM-DD' in the local timezone.
export function todayISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
