const zones = [
  ['Alpha', '5', '5'],
  ['Charlie', '4', '3'],
  ['Delta', '2', '1'],
  ['Metal', '5', '5'],
]
const penalties = [
  ['Hit on a forbidden target (No-shoot)', '−10', 'Per hit'],
  ['Missed target (miss)', '−10', 'Per target'],
  ['Not shooting / ignored target', '−10', 'Per target'],
  ['Safety / procedure fault', '−10', 'Per occurrence'],
  ['Crossing the firing zone', '−10', 'Per occurrence'],
  ['Shooting after hitting the final target', '−10', 'Per occurrence'],
]

export default function Regras() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black uppercase tracking-widest">Rules &amp; scoring</h1>

      <p className="text-bullet-muted">
        4 stages. Each stage is scored by <b className="text-bullet-text">Hit Factor</b> = Points ÷ Time.
        Stage points give 100 to the best Hit Factor and proportional to the rest.
        The overall ranking is the sum of the points from the 4 stages.
      </p>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-bullet-accent">Scoring by zone</h2>
        <div className="tactical-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-bullet-muted">
                <th className="px-3 py-2">Zone</th><th className="px-3 py-2">Major Factor (GBBR)</th><th className="px-3 py-2">Minor Factor (AEG/HPA)</th></tr>
            </thead>
            <tbody>
              {zones.map(z => (
                <tr key={z[0]} className="border-t border-white/10">
                  <td className="px-3 py-2 uppercase tracking-wider">{z[0]}</td><td className="px-3 py-2 text-bullet-accent">{z[1]}</td><td className="px-3 py-2 text-bullet-accent">{z[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-bullet-accent">Penalties</h2>
        <div className="tactical-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-bullet-muted">
                <th className="px-3 py-2">Description</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Applies to</th></tr>
            </thead>
            <tbody>
              {penalties.map(p => (
                <tr key={p[0]} className="border-t border-white/10">
                  <td className="px-3 py-2">{p[0]}</td><td className="px-3 py-2 font-bold text-red-500">{p[1]}</td><td className="px-3 py-2 text-bullet-muted">{p[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-bullet-muted">
          Single weapon: a time penalty added to the stage time (value set by the organisation).
        </p>
      </section>
    </div>
  )
}
