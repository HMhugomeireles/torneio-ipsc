import { useEffect, useMemo, useState } from 'react'
import type { Player, Judge, Factor, StageResultInput, Tournament } from '../types'
import * as data from '../lib/data'
import { Counter } from '../components/Counter'
import { points as calcPoints, finalTime as calcFinalTime, hitFactor as calcHf, singleWeaponPenalty } from '../lib/scoring'

const EMPTY = {
  alpha: 0, charlie: 0, delta: 0, metal: 0,
  pen_miss: 0, pen_no_shoot: 0, pen_safety: 0, pen_out_of_zone: 0,
}

export default function ScoreEntry() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  const [tournamentId, setTournamentId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [judgeId, setJudgeId] = useState('')
  const [stage, setStage] = useState(1)
  const [factor, setFactor] = useState<Factor>('major')
  const [counts, setCounts] = useState({ ...EMPTY })
  const [timeSeconds, setTimeSeconds] = useState(0)
  const [singleWeapon, setSingleWeapon] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const tournament = tournaments.find(t => t.id === tournamentId) ?? null
  const stageCount = tournament?.stage_names.length ?? 0
  const swChanges = tournament?.stage_weapon_changes[stage - 1] ?? 0
  const singleWeaponSeconds = singleWeapon
    ? singleWeaponPenalty(tournament?.single_weapon_seconds_per_change ?? 0, swChanges)
    : 0

  useEffect(() => {
    (async () => {
      setTournaments(await data.getTournaments())
      setJudges(await data.getJudges())
    })()
  }, [])

  // When tournament changes: load enrolled players, reset selection + defaults.
  useEffect(() => {
    if (!tournamentId) { setPlayers([]); setPlayerId(''); return }
    (async () => {
      const t = tournaments.find(x => x.id === tournamentId) ?? null
      setPlayers(await data.getEnrolledPlayers(tournamentId))
      setPlayerId('')
      setStage(s => (t && s > t.stage_names.length ? 1 : s))
    })()
  }, [tournamentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load existing result when tournament+player+stage chosen (edit mode).
  useEffect(() => {
    if (!tournamentId || !playerId) return
    let ignore = false;
    (async () => {
      const existing = await data.getResult(tournamentId, playerId, stage)
      if (ignore) return
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
      } else {
        setCounts({ ...EMPTY }); setTimeSeconds(0); setSingleWeapon(false)
      }
    })()
    return () => { ignore = true }
  }, [tournamentId, playerId, stage]) // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => {
    const r = {
      ...counts, factor, time_seconds: timeSeconds,
      single_weapon: singleWeapon, single_weapon_seconds: singleWeaponSeconds,
    } as any
    return { pts: calcPoints(r), t: calcFinalTime(r), hf: calcHf(r) }
  }, [counts, factor, timeSeconds, singleWeapon, singleWeaponSeconds, stage, tournamentId])

  const charliePts = factor === 'major' ? 4 : 3
  const deltaPts = factor === 'major' ? 2 : 1

  function set<K extends keyof typeof counts>(k: K, v: number) {
    setCounts(c => ({ ...c, [k]: v }))
  }

  async function save() {
    if (!tournamentId || !playerId || !judgeId) { setStatus('Escolhe torneio, atirador e juiz.'); return }
    const input: StageResultInput = {
      tournament_id: tournamentId, player_id: playerId, judge_id: judgeId, stage, factor, ...counts,
      time_seconds: timeSeconds, single_weapon: singleWeapon,
      single_weapon_seconds: singleWeaponSeconds,
    }
    try {
      await data.saveResult(input)
      setStatus('Guardado ✓')
    } catch (e) { setStatus('Erro: ' + String(e)) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="ipsc-eyebrow mb-2">Registo de resultados</div>
        <h1 className="ipsc-h1">Resultados</h1>
      </div>

      <div className="grid gap-2">
        <select className="ipsc-input" value={tournamentId} onChange={e => setTournamentId(e.target.value)}>
          <option value="">— Torneio —</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name} ({t.event_date})</option>)}
        </select>
        <select className="ipsc-input" value={playerId} onChange={e => setPlayerId(e.target.value)}>
          <option value="">— Atirador —</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select className="ipsc-input flex-1" value={judgeId} onChange={e => setJudgeId(e.target.value)}>
            <option value="">— Juiz —</option>
            {judges.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
          <select className="ipsc-input flex-1" value={stage} onChange={e => setStage(Number(e.target.value))}>
            {Array.from({ length: stageCount }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{tournament?.stage_names[n - 1] ?? `Stage ${n}`}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          {(['major', 'minor'] as Factor[]).map(f => (
            <button key={f} onClick={() => setFactor(f)}
              className={`font-jet flex-1 cursor-pointer rounded-[3px] border p-3 text-[13px] font-bold uppercase tracking-[0.14em] transition-colors ${factor === f ? 'border-ipsc-accent bg-ipsc-accent text-ipsc-bg' : 'border-ipsc-line bg-black/30 text-ipsc-muted2 hover:text-ipsc-text'}`}>
              {f === 'major' ? 'Major Factor' : 'Minor Factor'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="ipsc-label mb-1.5">Pontos</div>
        <div className="grid gap-2">
          <Counter label="ALPHA" sublabel="5 pts" value={counts.alpha} onChange={v => set('alpha', v)} />
          <Counter label="CHARLIE" sublabel={`${charliePts} pts`} value={counts.charlie} onChange={v => set('charlie', v)} />
          <Counter label="DELTA" sublabel={`${deltaPts} pt`} value={counts.delta} onChange={v => set('delta', v)} />
          <Counter label="METAL" sublabel="5 pts" value={counts.metal} onChange={v => set('metal', v)} />
        </div>
      </div>

      <div>
        <div className="ipsc-label mb-1.5">Penalizações (−10 cada)</div>
        <div className="grid gap-2">
          <Counter variant="penalty" label="Miss" value={counts.pen_miss} onChange={v => set('pen_miss', v)} />
          <Counter variant="penalty" label="No-shoot" value={counts.pen_no_shoot} onChange={v => set('pen_no_shoot', v)} />
          <Counter variant="penalty" label="Segurança / Procedimento" value={counts.pen_safety} onChange={v => set('pen_safety', v)} />
          <Counter variant="penalty" label="Fora da zona de tiro" value={counts.pen_out_of_zone} onChange={v => set('pen_out_of_zone', v)} />
        </div>
      </div>

      <div className="ipsc-panel p-3">
        <label className="font-jet flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-ipsc-muted2">
          Tempo (seg):
          <input type="number" step="0.01" className="ipsc-input w-28"
            value={timeSeconds} onChange={e => { const n = Number(e.target.value); setTimeSeconds(Number.isFinite(n) ? n : 0) }} />
        </label>
        <label className="font-jet mt-3 flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-ipsc-muted2">
          <input type="checkbox" className="accent-ipsc-accent" checked={singleWeapon} onChange={e => setSingleWeapon(e.target.checked)} />
          Arma única
          {singleWeapon && (
            <span className="ml-auto text-ipsc-accent">+{singleWeaponSeconds}s ({swChanges} troca{swChanges === 1 ? '' : 's'})</span>
          )}
        </label>
      </div>

      <div className="font-jet flex justify-between rounded-[5px] border border-ipsc-accent bg-ipsc-panel p-3 text-[13px] font-bold uppercase tracking-[0.12em]">
        <span>Pts: <span className="text-ipsc-accent">{preview.pts}</span></span>
        <span>Tempo: <span className="text-ipsc-accent">{preview.t.toFixed(2)}s</span></span>
        <span>HF: <span className="text-ipsc-accent">{preview.hf.toFixed(2)}</span></span>
      </div>

      {status && <p className="font-jet text-center text-[12px] uppercase tracking-[0.12em] text-ipsc-text">{status}</p>}
      <button onClick={save} className="ipsc-btn p-4 text-[15px]">Guardar stage</button>
    </div>
  )
}
