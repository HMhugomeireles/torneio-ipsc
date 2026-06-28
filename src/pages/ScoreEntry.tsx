import { useEffect, useMemo, useState } from 'react'
import type { Player, Judge, Factor, StageResultInput, Tournament } from '../types'
import * as data from '../lib/data'
import { Counter } from '../components/Counter'
import { points as calcPoints, finalTime as calcFinalTime, hitFactor as calcHf, penaltyCount, singleWeaponPenalty } from '../lib/scoring'
import { regCode } from '../lib/format'

const EMPTY = {
  alpha: 0, charlie: 0, delta: 0, metal: 0,
  pen_miss: 0, pen_no_shoot: 0, pen_safety: 0, pen_out_of_zone: 0,
}

const STEPS = [
  { n: 1, label: 'Torneio' },
  { n: 2, label: 'Juiz' },
  { n: 3, label: 'Stage' },
  { n: 4, label: 'Atirador' },
  { n: 5, label: 'Pontos' },
]

interface Option { key: string; label: string; sub: string; selected: boolean; onSelect: () => void }

export default function ScoreEntry() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  const [step, setStep] = useState(1)
  const [tournamentId, setTournamentId] = useState('')
  const [judgeId, setJudgeId] = useState('')
  const [stage, setStage] = useState<number | null>(null)
  const [playerId, setPlayerId] = useState('')

  const [factor, setFactor] = useState<Factor>('major')
  const [counts, setCounts] = useState({ ...EMPTY })
  const [timeSeconds, setTimeSeconds] = useState(0)
  const [singleWeapon, setSingleWeapon] = useState(false)

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Player ids that already have a result for the current tournament + stage.
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set())
  const [savedTick, setSavedTick] = useState(0)

  const tournament = tournaments.find(t => t.id === tournamentId) ?? null
  const swChanges = stage != null ? (tournament?.stage_weapon_changes[stage - 1] ?? 0) : 0
  const singleWeaponSeconds = singleWeapon
    ? singleWeaponPenalty(tournament?.single_weapon_seconds_per_change ?? 0, swChanges)
    : 0

  useEffect(() => {
    (async () => {
      setTournaments(await data.getTournaments())
      setJudges(await data.getJudges())
    })()
  }, [])

  // Load enrolled players when the tournament changes.
  useEffect(() => {
    if (!tournamentId) { setPlayers([]); return }
    (async () => { setPlayers(await data.getEnrolledPlayers(tournamentId)) })()
  }, [tournamentId])

  // Track which enrolled players already have a result for this tournament + stage.
  useEffect(() => {
    if (!tournamentId || stage == null) { setScoredIds(new Set()); return }
    let ignore = false;
    (async () => {
      const results = await data.getResultsForTournament(tournamentId)
      if (ignore) return
      setScoredIds(new Set(results.filter(r => r.stage === stage).map(r => r.player_id)))
    })()
    return () => { ignore = true }
  }, [tournamentId, stage, savedTick])

  // Load an existing result (edit mode) once tournament + stage + player are chosen.
  useEffect(() => {
    if (!tournamentId || !playerId || stage == null) return
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
  }, [tournamentId, playerId, stage])

  const preview = useMemo(() => {
    const r = {
      ...counts, factor, time_seconds: timeSeconds,
      single_weapon: singleWeapon, single_weapon_seconds: singleWeaponSeconds,
    } as any
    return { pts: calcPoints(r), t: calcFinalTime(r), hf: calcHf(r), pen: penaltyCount(r) * 10 }
  }, [counts, factor, timeSeconds, singleWeapon, singleWeaponSeconds])

  const charliePts = factor === 'major' ? 4 : 3
  const deltaPts = factor === 'major' ? 2 : 1

  function set<K extends keyof typeof counts>(k: K, v: number) {
    setCounts(c => ({ ...c, [k]: v }))
  }
  function resetScore() {
    setFactor('major'); setCounts({ ...EMPTY }); setTimeSeconds(0); setSingleWeapon(false)
  }

  // ----- step options -----
  const options: Option[] = useMemo(() => {
    if (step === 1) return tournaments.map(t => ({
      key: t.id, label: t.name, sub: t.event_date,
      selected: t.id === tournamentId,
      onSelect: () => { setTournamentId(t.id); setStage(null); setPlayerId('') },
    }))
    if (step === 2) return judges.map(j => ({
      key: j.id, label: j.name, sub: 'Juiz',
      selected: j.id === judgeId, onSelect: () => setJudgeId(j.id),
    }))
    if (step === 3) return (tournament?.stage_names ?? []).map((name, i) => ({
      key: String(i), label: `Stage ${i + 1}`, sub: name,
      selected: stage === i + 1, onSelect: () => setStage(i + 1),
    }))
    if (step === 4) return players
      .filter(p => p.id === playerId || !scoredIds.has(p.id))
      .map(p => ({
        key: p.id, label: p.name, sub: regCode(p.reg_no) || 'Atirador',
        selected: p.id === playerId, onSelect: () => setPlayerId(p.id),
      }))
    return []
  }, [step, tournaments, judges, players, tournament, tournamentId, judgeId, stage, playerId, scoredIds])

  const stepTitle = ['', 'Selecionar torneio', 'Selecionar juiz', 'Selecionar stage', 'Selecionar atirador'][step] ?? ''
  const stepDesc = ['', 'Escolhe a prova a registar.', 'Range Officer responsável pelo stage.', 'Stage a registar nesta prova.', 'Atleta a pontuar.'][step] ?? ''
  const canNext =
    (step === 1 && !!tournamentId) ||
    (step === 2 && !!judgeId) ||
    (step === 3 && stage != null) ||
    (step === 4 && !!playerId)

  function goNext() { if (canNext) setStep(s => Math.min(5, s + 1)) }
  function goBack() { setStep(s => Math.max(1, s - 1)) }

  async function save() {
    if (!tournamentId || !playerId || !judgeId || stage == null) { setError('Seleção incompleta.'); return }
    const input: StageResultInput = {
      tournament_id: tournamentId, player_id: playerId, judge_id: judgeId, stage, factor, ...counts,
      time_seconds: timeSeconds, single_weapon: singleWeapon, single_weapon_seconds: singleWeaponSeconds,
    }
    try { await data.saveResult(input); setError(null); setSavedTick(t => t + 1); setShowSaveModal(true) }
    catch (e) { setError('Erro: ' + String(e)) }
  }
  function saveSame() { setShowSaveModal(false); setPlayerId(''); resetScore(); setStep(4) }
  function saveNew() {
    setShowSaveModal(false)
    setTournamentId(''); setJudgeId(''); setStage(null); setPlayerId(''); resetScore(); setStep(1)
  }

  const summary = [
    { label: 'TORNEIO', value: tournament?.name ?? '—' },
    { label: 'JUIZ', value: judges.find(j => j.id === judgeId)?.name ?? '—' },
    { label: 'STAGE', value: stage != null ? `Stage ${stage}` : '—' },
    { label: 'ATIRADOR', value: players.find(p => p.id === playerId)?.name ?? '—' },
  ]

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <div className="ipsc-eyebrow mb-2">Registo de resultados</div>
        <h1 className="font-saira-cond text-[36px] font-extrabold leading-[0.95] md:text-[40px]">Inserir Pontuação</h1>
      </div>

      {/* stepper */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-ipsc-line pb-5">
        {STEPS.map(s => {
          const active = step === s.n
          const done = step > s.n
          return (
            <div key={s.n} className="flex flex-1 items-center gap-2.5">
              <div
                className="font-jet flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border text-[12px] font-bold"
                style={{
                  background: active ? '#e8732a' : done ? '#3a4138' : '#15180f',
                  color: active ? '#0d100e' : done ? '#cfd2cc' : '#5a605a',
                  borderColor: active ? '#e8732a' : done ? '#3a4138' : '#23281f',
                }}
              >
                {s.n}
              </div>
              <span
                className="font-jet hidden text-[10px] font-bold uppercase tracking-[0.1em] sm:inline"
                style={{ color: active ? '#fff' : done ? '#9aa09a' : '#5a605a' }}
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {error && <p className="font-jet rounded border border-red-500/50 bg-red-500/10 p-2 text-[12px] uppercase tracking-[0.1em] text-red-400">{error}</p>}

      {/* ----- selection steps ----- */}
      {step <= 4 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="m-0 font-saira-cond text-[24px] font-bold">{stepTitle}</h2>
            <p className="font-jet mt-1 text-[12px] text-ipsc-muted">{stepDesc}</p>
          </div>

          {options.length === 0
            ? <p className="ipsc-label">{step === 4 ? 'Todos os atiradores inscritos já têm registo neste stage.' : 'Nada para selecionar.'}</p>
            : (
              <div className="grid gap-2.5">
                {options.map(o => (
                  <button
                    key={o.key}
                    onClick={o.onSelect}
                    className="flex cursor-pointer items-center gap-3.5 rounded-[6px] border p-4 text-left transition-colors"
                    style={{
                      background: o.selected ? '#1a1109' : '#11140f',
                      borderColor: o.selected ? '#e8732a' : '#1d211e',
                    }}
                  >
                    <span
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2"
                      style={{ borderColor: o.selected ? '#e8732a' : '#2c322c' }}
                    >
                      {o.selected && <span className="h-2 w-2 rounded-full bg-ipsc-accent" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-saira-cond text-[18px] font-bold leading-tight" style={{ color: o.selected ? '#fff' : '#e9e7e1' }}>{o.label}</span>
                      <span className="font-jet mt-1 block truncate text-[11px] text-ipsc-muted">{o.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

          <div className="flex gap-3">
            {step > 1 && (
              <button onClick={goBack} className="font-jet cursor-pointer rounded-[4px] border border-ipsc-line2 px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#cfd2cc] transition-colors hover:border-ipsc-muted2">← Voltar</button>
            )}
            <button
              onClick={goNext}
              disabled={!canNext}
              className="font-jet flex-1 cursor-pointer rounded-[4px] px-5 py-3.5 text-center text-[12px] font-bold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed"
              style={{ background: canNext ? '#e8732a' : '#15180f', color: canNext ? '#0d100e' : '#5a605a' }}
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ----- scoring step ----- */}
      {step === 5 && (
        <div className="flex flex-col gap-5">
          {/* selection summary */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-ipsc-line bg-ipsc-line md:grid-cols-4">
            {summary.map(s => (
              <div key={s.label} className="bg-ipsc-panel px-4 py-3">
                <div className="font-jet mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-ipsc-muted">{s.label}</div>
                <div className="truncate font-saira-cond text-[15px] font-bold leading-tight text-ipsc-text">{s.value}</div>
              </div>
            ))}
          </div>

          {/* factor */}
          <div className="grid grid-cols-2 gap-2.5">
            {(['major', 'minor'] as Factor[]).map(f => {
              const on = factor === f
              return (
                <button
                  key={f}
                  onClick={() => setFactor(f)}
                  className="font-jet cursor-pointer rounded-[5px] border px-3 py-3.5 text-center text-[12px] font-bold uppercase tracking-[0.12em] transition-colors"
                  style={{
                    background: on ? '#e8732a' : '#11140f',
                    color: on ? '#0d100e' : '#9aa09a',
                    borderColor: on ? '#e8732a' : '#1d211e',
                  }}
                >
                  {f === 'major' ? 'Major Factor' : 'Minor Factor'}
                </button>
              )
            })}
          </div>

          {/* points */}
          <div>
            <div className="ipsc-label mb-2.5">Pontos</div>
            <div className="grid gap-2">
              <Counter label="ALPHA" sublabel="5 pts" value={counts.alpha} onChange={v => set('alpha', v)} />
              <Counter label="CHARLIE" sublabel={`${charliePts} pts`} value={counts.charlie} onChange={v => set('charlie', v)} />
              <Counter label="DELTA" sublabel={`${deltaPts} pt`} value={counts.delta} onChange={v => set('delta', v)} />
              <Counter label="METAL" sublabel="5 pts" value={counts.metal} onChange={v => set('metal', v)} />
            </div>
          </div>

          {/* penalties */}
          <div>
            <div className="ipsc-label mb-2.5">Penalizações (−10 cada)</div>
            <div className="grid gap-2">
              <Counter variant="penalty" label="Miss" value={counts.pen_miss} onChange={v => set('pen_miss', v)} />
              <Counter variant="penalty" label="No-shoot" value={counts.pen_no_shoot} onChange={v => set('pen_no_shoot', v)} />
              <Counter variant="penalty" label="Segurança / Procedimento" value={counts.pen_safety} onChange={v => set('pen_safety', v)} />
              <Counter variant="penalty" label="Fora da zona de tiro" value={counts.pen_out_of_zone} onChange={v => set('pen_out_of_zone', v)} />
            </div>
          </div>

          {/* time / single weapon */}
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-[6px] border border-ipsc-line bg-ipsc-panel p-4">
            <label className="font-jet flex items-center gap-3 text-[11px] uppercase tracking-[0.1em] text-ipsc-muted2">
              Tempo (seg)
              <input type="number" step="0.01" className="ipsc-input w-28 font-jet"
                value={timeSeconds} onChange={e => { const n = Number(e.target.value); setTimeSeconds(Number.isFinite(n) ? n : 0) }} />
            </label>
            <label className="font-jet flex cursor-pointer items-center gap-2.5 text-[11px] uppercase tracking-[0.1em] text-ipsc-muted2">
              <input type="checkbox" className="accent-ipsc-accent" checked={singleWeapon} onChange={e => setSingleWeapon(e.target.checked)} />
              Arma única
              {singleWeapon && <span className="text-ipsc-accent">+{singleWeaponSeconds}s ({swChanges} troca{swChanges === 1 ? '' : 's'})</span>}
            </label>
          </div>

          {/* live summary */}
          <div className="font-jet flex justify-between rounded-[6px] border border-ipsc-accent bg-ipsc-panel px-5 py-4 text-[14px] font-bold uppercase tracking-[0.06em]">
            <span className="text-ipsc-muted2">Pts: <span className="text-ipsc-accent">{preview.pts}</span></span>
            <span className="text-ipsc-muted2">Penal.: <span className="text-red-400">−{preview.pen}</span></span>
            <span className="text-ipsc-muted2">HF: <span className="text-ipsc-accent">{preview.hf.toFixed(2)}</span></span>
          </div>

          {/* actions */}
          <div className="flex gap-3">
            <button onClick={goBack} className="font-jet cursor-pointer rounded-[4px] border border-ipsc-line2 px-5 py-4 text-[12px] font-bold uppercase tracking-[0.1em] text-[#cfd2cc] transition-colors hover:border-ipsc-muted2">← Voltar</button>
            <button onClick={save} className="ipsc-btn flex-1 py-4 text-[13px]">Guardar resultado</button>
          </div>
        </div>
      )}

      {/* ----- save modal ----- */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-[430px] rounded-[10px] border border-ipsc-line2 bg-ipsc-panel p-7 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[#2a6b42] bg-[#0f2618] text-[14px] text-[#6fae84]">✓</span>
              <span className="font-jet text-[11px] font-bold uppercase tracking-[0.14em] text-[#6fae84]">Resultado guardado</span>
            </div>
            <h3 className="m-0 mb-1.5 font-saira-cond text-[25px] font-bold">Registar próximo atirador?</h3>
            <p className="font-jet m-0 mb-4 text-[12px] leading-[1.5] text-ipsc-muted2">Reutiliza Torneio, Juiz e Stage e salta direto para a seleção do atirador.</p>
            <div className="mb-5 grid gap-2">
              {summary.slice(0, 3).map(m => (
                <div key={m.label} className="flex items-center justify-between rounded-[5px] border border-ipsc-line bg-ipsc-bg px-3.5 py-2.5">
                  <span className="font-jet text-[10px] font-semibold uppercase tracking-[0.12em] text-ipsc-muted">{m.label}</span>
                  <span className="truncate pl-3 font-saira-cond text-[14px] font-bold text-ipsc-text">{m.value}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-2.5">
              <button onClick={saveSame} className="ipsc-btn py-4 text-[12px]">Mesmos dados · novo atirador</button>
              <button onClick={saveNew} className="font-jet cursor-pointer rounded-[5px] border border-ipsc-line2 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#cfd2cc] transition-colors hover:border-ipsc-muted2">Novo registo (limpar tudo)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
