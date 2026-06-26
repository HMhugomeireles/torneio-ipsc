import { useEffect, useMemo, useState } from 'react'
import type { Player, Judge, Factor, StageResultInput, TournamentSettings } from '../types'
import * as data from '../lib/data'
import { Counter } from '../components/Counter'
import { points as calcPoints, finalTime as calcFinalTime, hitFactor as calcHf } from '../lib/scoring'

const EMPTY = {
  alpha: 0, charlie: 0, delta: 0, metal: 0,
  pen_miss: 0, pen_no_shoot: 0, pen_safety: 0, pen_out_of_zone: 0,
}

export default function ScoreEntry() {
  const [players, setPlayers] = useState<Player[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [settings, setSettings] = useState<TournamentSettings | null>(null)

  const [playerId, setPlayerId] = useState('')
  const [judgeId, setJudgeId] = useState('')
  const [stage, setStage] = useState(1)
  const [factor, setFactor] = useState<Factor>('major')
  const [counts, setCounts] = useState({ ...EMPTY })
  const [timeSeconds, setTimeSeconds] = useState(0)
  const [singleWeapon, setSingleWeapon] = useState(false)
  const [singleWeaponSeconds, setSingleWeaponSeconds] = useState(0)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setPlayers(await data.getPlayers())
      setJudges(await data.getJudges())
      const s = await data.getSettings()
      setSettings(s)
      setSingleWeaponSeconds(s.default_single_weapon_seconds)
    })()
  }, [])

  // Load existing result when player+stage chosen (edit mode).
  useEffect(() => {
    if (!playerId) return
    (async () => {
      const existing = await data.getResult(playerId, stage)
      if (existing) {
        setJudgeId(existing.judge_id)
        setFactor(existing.factor)
        setCounts({
          alpha: existing.alpha, charlie: existing.charlie, delta: existing.delta, metal: existing.metal,
          pen_miss: existing.pen_miss, pen_no_shoot: existing.pen_no_shoot,
          pen_safety: existing.pen_safety, pen_out_of_zone: existing.pen_out_of_zone,
        })
        setTimeSeconds(existing.time_seconds)
        setSingleWeapon(existing.single_weapon)
        setSingleWeaponSeconds(existing.single_weapon_seconds)
      } else {
        setCounts({ ...EMPTY }); setTimeSeconds(0); setSingleWeapon(false)
        setSingleWeaponSeconds(settings?.default_single_weapon_seconds ?? 10)
      }
    })()
  }, [playerId, stage]) // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => {
    const r = {
      ...counts, factor, time_seconds: timeSeconds,
      single_weapon: singleWeapon, single_weapon_seconds: singleWeaponSeconds,
    } as any
    return { pts: calcPoints(r), t: calcFinalTime(r), hf: calcHf(r) }
  }, [counts, factor, timeSeconds, singleWeapon, singleWeaponSeconds])

  const charliePts = factor === 'major' ? 4 : 3
  const deltaPts = factor === 'major' ? 2 : 1

  function set<K extends keyof typeof counts>(k: K, v: number) {
    setCounts(c => ({ ...c, [k]: v }))
  }

  async function save() {
    if (!playerId || !judgeId) { setStatus('Choose a player and a judge.'); return }
    const input: StageResultInput = {
      player_id: playerId, judge_id: judgeId, stage, factor, ...counts,
      time_seconds: timeSeconds, single_weapon: singleWeapon,
      single_weapon_seconds: singleWeapon ? singleWeaponSeconds : 0,
    }
    try {
      await data.saveResult(input)
      setStatus('Saved ✓')
    } catch (e) { setStatus('Error: ' + String(e)) }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-black uppercase tracking-widest">Score Entry</h1>

      <div className="grid gap-2">
        <select className="tactical-input" value={playerId} onChange={e => setPlayerId(e.target.value)}>
          <option value="">— Player —</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select className="tactical-input flex-1" value={judgeId} onChange={e => setJudgeId(e.target.value)}>
            <option value="">— Judge —</option>
            {judges.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
          <select className="tactical-input flex-1" value={stage} onChange={e => setStage(Number(e.target.value))}>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{settings?.stage_names[n - 1] ?? `Stage ${n}`}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {(['major', 'minor'] as Factor[]).map(f => (
            <button key={f} onClick={() => setFactor(f)}
              className={`flex-1 cursor-pointer border p-3 font-bold uppercase tracking-widest transition-colors ${factor === f ? 'border-bullet-accent bg-bullet-accent text-bullet-dark' : 'border-white/10 bg-black/40 text-bullet-muted hover:text-bullet-text'}`}>
              {f === 'major' ? 'Major Factor' : 'Minor Factor'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs uppercase tracking-widest text-bullet-muted">Points</div>
        <div className="grid gap-2">
          <Counter label="ALPHA" sublabel="5 pts" value={counts.alpha} onChange={v => set('alpha', v)} />
          <Counter label="CHARLIE" sublabel={`${charliePts} pts`} value={counts.charlie} onChange={v => set('charlie', v)} />
          <Counter label="DELTA" sublabel={`${deltaPts} pt`} value={counts.delta} onChange={v => set('delta', v)} />
          <Counter label="METAL" sublabel="5 pts" value={counts.metal} onChange={v => set('metal', v)} />
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs uppercase tracking-widest text-bullet-muted">Penalties (−10 each)</div>
        <div className="grid gap-2">
          <Counter variant="penalty" label="Miss" value={counts.pen_miss} onChange={v => set('pen_miss', v)} />
          <Counter variant="penalty" label="No-shoot" value={counts.pen_no_shoot} onChange={v => set('pen_no_shoot', v)} />
          <Counter variant="penalty" label="Safety / Procedure" value={counts.pen_safety} onChange={v => set('pen_safety', v)} />
          <Counter variant="penalty" label="Outside firing zone" value={counts.pen_out_of_zone} onChange={v => set('pen_out_of_zone', v)} />
        </div>
      </div>

      <div className="tactical-panel p-3">
        <label className="flex items-center gap-2 uppercase tracking-widest text-bullet-muted">
          Time (sec):
          <input type="number" step="0.01" className="tactical-input w-28"
            value={timeSeconds} onChange={e => { const n = Number(e.target.value); setTimeSeconds(Number.isFinite(n) ? n : 0) }} />
        </label>
        <label className="mt-3 flex items-center gap-2 uppercase tracking-widest text-bullet-muted">
          <input type="checkbox" className="accent-bullet-accent" checked={singleWeapon} onChange={e => setSingleWeapon(e.target.checked)} />
          Single weapon
          {singleWeapon && (
            <>
              <span className="ml-auto text-bullet-accent">+</span>
              <input type="number" className="tactical-input w-20"
                value={singleWeaponSeconds} onChange={e => { const n = Number(e.target.value); setSingleWeaponSeconds(Number.isFinite(n) ? n : 0) }} />
              <span>sec</span>
            </>
          )}
        </label>
      </div>

      <div className="glow-orange flex justify-between border border-bullet-accent bg-black/60 p-3 font-bold uppercase tracking-widest">
        <span>Pts: <span className="text-bullet-accent">{preview.pts}</span></span>
        <span>Time: <span className="text-bullet-accent">{preview.t.toFixed(2)}s</span></span>
        <span>HF: <span className="text-bullet-accent">{preview.hf.toFixed(2)}</span></span>
      </div>

      {status && <p className="text-center uppercase tracking-widest text-bullet-text">{status}</p>}
      <button onClick={save}
        className="relative cursor-pointer overflow-hidden bg-bullet-accent p-4 text-lg font-bold uppercase tracking-[0.2em] text-bullet-dark transition-colors duration-300 hover:bg-white hover:text-black"
        style={{ clipPath: 'polygon(3% 0, 100% 0, 100% 70%, 97% 100%, 0 100%, 0 30%)' }}>Save stage</button>
    </div>
  )
}
