import { describe, it, expect } from 'vitest'
import { isPast } from './dates'

describe('isPast', () => {
  it('is true when the event date is before today', () => {
    expect(isPast('2020-01-01', '2026-06-27')).toBe(true)
  })
  it('is false when the event date is today', () => {
    expect(isPast('2026-06-27', '2026-06-27')).toBe(false)
  })
  it('is false when the event date is in the future', () => {
    expect(isPast('2030-12-31', '2026-06-27')).toBe(false)
  })
})
