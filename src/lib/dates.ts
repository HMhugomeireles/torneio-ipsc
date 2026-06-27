// ISO 'YYYY-MM-DD' strings compare lexicographically in date order.
export function isPast(eventDate: string, today: string): boolean {
  return eventDate < today
}

// Today's date as 'YYYY-MM-DD' (UTC date).
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
