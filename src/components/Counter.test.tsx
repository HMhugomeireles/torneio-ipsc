import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './Counter'

describe('Counter', () => {
  it('shows label and value, and increments/decrements without going below 0', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<Counter label="ALPHA" value={0} onChange={onChange} />)
    expect(screen.getByText('ALPHA')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onChange).toHaveBeenCalledWith(1)

    // at value 0, minus must not go negative
    await userEvent.click(screen.getByRole('button', { name: '−' }))
    expect(onChange).not.toHaveBeenCalledWith(-1)

    rerender(<Counter label="ALPHA" value={3} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '−' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})
