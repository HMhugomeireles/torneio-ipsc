interface CounterProps {
  label: string
  sublabel?: string
  value: number
  onChange: (next: number) => void
  variant?: 'score' | 'penalty'
}

export function Counter({ label, sublabel, value, onChange, variant = 'score' }: CounterProps) {
  const accent = variant === 'penalty' ? 'border-l-red-500' : 'border-l-ipsc-accent'
  const plus =
    variant === 'penalty'
      ? 'bg-red-500 text-white hover:bg-red-400'
      : 'bg-ipsc-accent text-ipsc-bg hover:bg-ipsc-text'
  return (
    <div className={`flex items-center gap-3 rounded-[5px] border border-ipsc-line border-l-[3px] ${accent} bg-ipsc-panel p-2.5`}>
      <div className="flex-1">
        <div className="font-jet text-[13px] font-bold uppercase tracking-[0.12em] text-ipsc-text">{label}</div>
        {sublabel && <div className="font-jet text-[11px] uppercase tracking-[0.12em] text-ipsc-muted">{sublabel}</div>}
      </div>
      <div className="w-8 text-center font-saira-cond text-[26px] font-bold text-ipsc-text">{value}</div>
      <div className="flex w-24 gap-2">
        <button type="button" aria-label="−"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex-1 cursor-pointer rounded-[3px] border border-ipsc-line bg-[#1a1e18] p-2 text-lg font-bold text-ipsc-text transition-colors hover:bg-ipsc-line2">−</button>
        <button type="button" aria-label="+"
          onClick={() => onChange(value + 1)}
          className={`flex-1 cursor-pointer rounded-[3px] p-2 text-lg font-bold transition-colors ${plus}`}>+</button>
      </div>
    </div>
  )
}
