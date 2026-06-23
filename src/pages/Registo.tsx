import { useEffect, useMemo, useState } from 'react'
import type { Player, Judge, Factor, StageResultInput, TournamentSettings } from '../types'
import * as data from '../lib/data'
import { Counter } from '../components/Counter'
import { points as calcPoints, finalTime as calcFinalTime, hitFactor as calcHf } from '../lib/scoring'

const EMPTY = {
  alpha: 0, charlie: 0, delta: 0, metal: 0,
  pen_miss: 0, pen_no_shoot: 0, pen_safety: 0, pen_out_of_zone: 0,
}

export default function Registo() {
  const [players, setPlayers] = useState<Player[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [settings, setSettings] = useState<TournamentSettings | null>(null)

  const [playerId, setPlayerId] = useState('')
  const [judgeId, setJudgeId] = useState('')
  const [stage, setStage] = useState(1)
  const [factor, setFactor] = useState<Factor>('maior')
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

  const charliePts = factor === 'maior' ? 4 : 3
  const deltaPts = factor === 'maior' ? 2 : 1

  function set<K extends keyof typeof counts>(k: K, v: number) {
    setCounts(c => ({ ...c, [k]: v }))
  }

  async function save() {
    if (!playerId || !judgeId) { setStatus('Escolhe jogador e juiz.'); return }
    const input: StageResultInput = {
      player_id: playerId, judge_id: judgeId, stage, factor, ...counts,
      time_seconds: timeSeconds, single_weapon: singleWeapon,
      single_weapon_seconds: singleWeapon ? singleWeaponSeconds : 0,
    }
    try {
      await data.saveResult(input)
      setStatus('Guardado ✓')
    } catch (e) { setStatus('Erro: ' + String(e)) }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Registo de estágio</h1>

      <div className="grid gap-2">
        <select className="rounded bg-neutral-800 p-3" value={playerId} onChange={e => setPlayerId(e.target.value)}>
          <option value="">— Jogador —</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select className="flex-1 rounded bg-neutral-800 p-3" value={judgeId} onChange={e => setJudgeId(e.target.value)}>
            <option value="">— Juiz —</option>
            {judges.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
          <select className="flex-1 rounded bg-neutral-800 p-3" value={stage} onChange={e => setStage(Number(e.target.value))}>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{settings?.stage_names[n - 1] ?? `Estágio ${n}`}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {(['maior', 'menor'] as Factor[]).map(f => (
            <button key={f} onClick={() => setFactor(f)}
              className={`flex-1 rounded p-3 font-bold ${factor === f ? 'bg-blue-600' : 'bg-neutral-800'}`}>
              Fator {f === 'maior' ? 'Maior' : 'Menor'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs uppercase tracking-wider text-neutral-400">Pontos</div>
        <div className="grid gap-2">
          <Counter label="ALPHA" sublabel="5 pts" value={counts.alpha} onChange={v => set('alpha', v)} />
          <Counter label="CHARLIE" sublabel={`${charliePts} pts`} value={counts.charlie} onChange={v => set('charlie', v)} />
          <Counter label="DELTA" sublabel={`${deltaPts} pt`} value={counts.delta} onChange={v => set('delta', v)} />
          <Counter label="METAL" sublabel="5 pts" value={counts.metal} onChange={v => set('metal', v)} />
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs uppercase tracking-wider text-neutral-400">Penalizações (−10 cada)</div>
        <div className="grid gap-2">
          <Counter variant="penalty" label="Miss / Falha" value={counts.pen_miss} onChange={v => set('pen_miss', v)} />
          <Counter variant="penalty" label="No-shoot" value={counts.pen_no_shoot} onChange={v => set('pen_no_shoot', v)} />
          <Counter variant="penalty" label="Segurança / Procedimento" value={counts.pen_safety} onChange={v => set('pen_safety', v)} />
          <Counter variant="penalty" label="Fora da zona" value={counts.pen_out_of_zone} onChange={v => set('pen_out_of_zone', v)} />
        </div>
      </div>

      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
        <label className="flex items-center gap-2">
          Tempo (seg):
          <input type="number" step="0.01" className="w-28 rounded bg-neutral-800 p-2"
            value={timeSeconds} onChange={e => setTimeSeconds(Number(e.target.value))} />
        </label>
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" checked={singleWeapon} onChange={e => setSingleWeapon(e.target.checked)} />
          Arma única
          {singleWeapon && (
            <>
              <span className="ml-auto">+</span>
              <input type="number" className="w-20 rounded bg-neutral-800 p-2"
                value={singleWeaponSeconds} onChange={e => setSingleWeaponSeconds(Number(e.target.value))} />
              <span>seg</span>
            </>
          )}
        </label>
      </div>

      <div className="flex justify-between rounded-lg border border-blue-600 bg-blue-950/40 p-3 font-bold">
        <span>Pts: {preview.pts}</span>
        <span>Tempo: {preview.t.toFixed(2)}s</span>
        <span>HF: {preview.hf.toFixed(2)}</span>
      </div>

      {status && <p className="text-center">{status}</p>}
      <button onClick={save} className="rounded-lg bg-blue-600 p-4 text-lg font-extrabold">Guardar estágio</button>
    </div>
  )
}
