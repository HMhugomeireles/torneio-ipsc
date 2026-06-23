interface CounterProps {
  label: string
  sublabel?: string
  value: number
  onChange: (next: number) => void
  variant?: 'score' | 'penalty'
}

export function Counter({ label, sublabel, value, onChange, variant = 'score' }: CounterProps) {
  const accent = variant === 'penalty' ? 'border-l-red-600' : 'border-l-blue-500'
  const plus = variant === 'penalty' ? 'bg-red-600' : 'bg-green-600'
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-neutral-700 border-l-4 ${accent} bg-neutral-900 p-2`}>
      <div className="flex-1">
        <div className="font-bold tracking-wide">{label}</div>
        {sublabel && <div className="text-xs text-neutral-400">{sublabel}</div>}
      </div>
      <div className="w-8 text-center text-2xl font-extrabold">{value}</div>
      <div className="flex w-24 gap-2">
        <button type="button" aria-label="−"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex-1 rounded bg-neutral-700 p-2 text-lg font-extrabold">−</button>
        <button type="button" aria-label="+"
          onClick={() => onChange(value + 1)}
          className={`flex-1 rounded ${plus} p-2 text-lg font-extrabold`}>+</button>
      </div>
    </div>
  )
}
