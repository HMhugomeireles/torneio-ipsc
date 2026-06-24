interface CounterProps {
  label: string
  sublabel?: string
  value: number
  onChange: (next: number) => void
  variant?: 'score' | 'penalty'
}

export function Counter({ label, sublabel, value, onChange, variant = 'score' }: CounterProps) {
  const accent = variant === 'penalty' ? 'border-l-red-500' : 'border-l-bullet-accent'
  const plus =
    variant === 'penalty'
      ? 'bg-red-500 text-white hover:bg-red-400'
      : 'bg-bullet-accent text-bullet-dark hover:bg-bullet-glow'
  return (
    <div className={`flex items-center gap-3 border border-white/10 border-l-4 ${accent} bg-black/60 p-2`}>
      <div className="flex-1">
        <div className="font-bold uppercase tracking-widest text-bullet-text">{label}</div>
        {sublabel && <div className="text-xs uppercase tracking-widest text-bullet-muted">{sublabel}</div>}
      </div>
      <div className="w-8 text-center text-2xl font-black text-bullet-text">{value}</div>
      <div className="flex w-24 gap-2">
        <button type="button" aria-label="−"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex-1 cursor-pointer border border-white/10 bg-bullet-panel-lighter p-2 text-lg font-black text-bullet-text transition-colors hover:bg-white/10"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 85% 100%, 0 100%)' }}>−</button>
        <button type="button" aria-label="+"
          onClick={() => onChange(value + 1)}
          className={`flex-1 cursor-pointer p-2 text-lg font-black transition-colors ${plus}`}
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 85% 100%, 0 100%)' }}>+</button>
      </div>
    </div>
  )
}
