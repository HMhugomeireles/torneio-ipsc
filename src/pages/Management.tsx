import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Enrollment, EnrollmentStatus, Player, Judge, Tournament } from '../types'
import * as data from '../lib/data'
import { isPast, todayISO } from '../lib/dates'
import { initials, regCode } from '../lib/format'

const accentBtn = 'ipsc-btn'
const dangerBtn = 'ipsc-btn-danger'
const ghostBtn = 'ipsc-btn-ghost'

type Tab = 'torneios' | 'inscricoes' | 'atiradores' | 'juizes'
const TABS: { key: Tab; label: string }[] = [
  { key: 'torneios', label: 'Torneios' },
  { key: 'inscricoes', label: 'Inscrições' },
  { key: 'atiradores', label: 'Atiradores' },
  { key: 'juizes', label: 'Juízes' },
]

export default function Management() {
  const today = todayISO()
  const [tab, setTab] = useState<Tab>('torneios')
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState<Tournament | null>(null)

  // Enrollments tab
  const [enrollTid, setEnrollTid] = useState('')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [enrollSel, setEnrollSel] = useState('')
  const [enrollNew, setEnrollNew] = useState('')

  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState(today)
  const [playerName, setPlayerName] = useState('')
  const [judgeName, setJudgeName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  async function reload() {
    try {
      const ts = await data.getTournaments()
      setTournaments(ts)
      setPlayers(await data.getPlayers())
      setJudges(await data.getJudges())
      if (selectedId) {
        const sel = ts.find(t => t.id === selectedId) ?? null
        setDraft(sel)
        if (!sel) setSelectedId('')
      } else {
        setDraft(null)
      }
      if (enrollTid && ts.some(t => t.id === enrollTid)) {
        setEnrollments(await data.getEnrollments(enrollTid))
      } else {
        if (enrollTid && !ts.some(t => t.id === enrollTid)) setEnrollTid('')
        setEnrollments([])
      }
    } catch (e) { setError(String(e)) }
  }
  useEffect(() => { reload() }, [selectedId, enrollTid]) // eslint-disable-line react-hooks/exhaustive-deps

  const past = draft ? isPast(draft.event_date, today) : false

  async function run(fn: () => Promise<void>) {
    try { setError(null); await fn(); await reload() }
    catch (e) { setError(String(e)) }
  }

  // tournaments
  async function createTournament() {
    if (!newName.trim() || !newDate) return
    await run(async () => { await data.addTournament({ name: newName.trim(), event_date: newDate }); setNewName('') })
  }
  async function deleteTournament(id: string) {
    await run(async () => { await data.deleteTournament(id); if (id === selectedId) setSelectedId('') })
  }
  function patchDraft(patch: Partial<Tournament>) {
    setDraft(d => (d ? { ...d, ...patch } : d))
  }
  async function saveDraft(patch: Partial<Tournament>) {
    if (!draft) return
    await run(async () => { await data.updateTournament(draft.id, patch) })
  }
  async function saveAndClose() {
    if (!draft) return
    try {
      await data.updateTournament(draft.id, {
        name: draft.name,
        event_date: draft.event_date,
        enroll_start: draft.enroll_start,
        enroll_end: draft.enroll_end,
        capacity: draft.capacity,
        stage_names: draft.stage_names,
        stage_targets: draft.stage_targets,
        stage_weapon_changes: draft.stage_weapon_changes,
        single_weapon_seconds_per_change: draft.single_weapon_seconds_per_change,
      })
      setToast({ kind: 'success', msg: 'Torneio guardado.' })
      setSelectedId('')
    } catch (e) {
      setToast({ kind: 'error', msg: 'Erro ao guardar: ' + String(e) })
    }
  }
  // stages
  async function addStage() {
    if (!draft) return
    const targets = draft.stage_names.map((_, i) => draft.stage_targets?.[i] ?? 0)
    await saveDraft({
      stage_names: [...draft.stage_names, `Stage ${draft.stage_names.length + 1}`],
      stage_targets: [...targets, 0],
      stage_weapon_changes: [...draft.stage_weapon_changes, 0],
    })
  }
  async function removeLastStage() {
    if (!draft || draft.stage_names.length <= 1) return
    const last = draft.stage_names.length
    await run(async () => {
      const n = await data.getStageResultCount(draft.id, last)
      if (n > 0) { setError('Não é possível remover um stage com resultados registados.'); return }
      await data.updateTournament(draft.id, {
        stage_names: draft.stage_names.slice(0, -1),
        stage_targets: draft.stage_names.slice(0, -1).map((_, i) => draft.stage_targets?.[i] ?? 0),
        stage_weapon_changes: draft.stage_weapon_changes.slice(0, -1),
      })
    })
  }
  // enrollment
  async function enrollExisting() {
    if (!enrollTid || !enrollSel) return
    await run(async () => { await data.enrollPlayer(enrollTid, enrollSel, 'provisional'); setEnrollSel('') })
  }
  async function enrollNewPlayer() {
    if (!enrollTid || !enrollNew.trim()) return
    await run(async () => {
      const p = await data.addPlayer(enrollNew.trim())
      await data.enrollPlayer(enrollTid, p.id, 'provisional')
      setEnrollNew('')
    })
  }
  async function toggleEnroll(pid: string, status: EnrollmentStatus) {
    if (!enrollTid) return
    await run(async () => { await data.setEnrollmentStatus(enrollTid, pid, status === 'confirmed' ? 'provisional' : 'confirmed') })
  }
  async function removeEnroll(pid: string) {
    if (!enrollTid) return
    await run(async () => { await data.unenrollPlayer(enrollTid, pid) })
  }
  // global players / judges
  async function addPlayer() {
    if (!playerName.trim()) return
    await run(async () => { await data.addPlayer(playerName.trim()); setPlayerName('') })
  }
  async function addJudge() {
    if (!judgeName.trim()) return
    await run(async () => { await data.addJudge(judgeName.trim()); setJudgeName('') })
  }

  const enrollAvailable = players.filter(p => !enrollments.some(e => e.player.id === p.id))
  const enrollT = tournaments.find(t => t.id === enrollTid) ?? null
  const enrollConfirmed = enrollments.filter(e => e.status === 'confirmed').length
  const enrollProvisional = enrollments.length - enrollConfirmed
  const enrollCapacity = enrollT?.capacity ?? null
  const enrollVacancies = enrollCapacity != null ? Math.max(0, enrollCapacity - enrollments.length) : null
  const enrollPct = enrollCapacity && enrollCapacity > 0 ? Math.min(100, Math.round((enrollments.length / enrollCapacity) * 100)) : 0
  const enrollOrdered = [...enrollments].sort((a, b) => (a.status === 'confirmed' ? 0 : 1) - (b.status === 'confirmed' ? 0 : 1))
  const tabCount = (k: Tab): number | null =>
    k === 'torneios' ? tournaments.length
      : k === 'atiradores' ? players.length
        : k === 'juizes' ? judges.length
          : enrollTid ? enrollments.length : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="ipsc-eyebrow mb-2">Administração</div>
        <h1 className="font-saira-cond text-[36px] font-extrabold leading-[0.95] md:text-[40px]">Gestão</h1>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-2 border-b border-ipsc-line pb-5">
        {TABS.map(t => {
          const on = tab === t.key
          const count = tabCount(t.key)
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="font-jet flex cursor-pointer items-center gap-2.5 rounded-[4px] border px-4 py-3 text-[12px] font-bold uppercase tracking-[0.1em] transition-colors"
              style={{
                background: on ? '#e8732a' : '#11140f',
                color: on ? '#0d100e' : '#9aa09a',
                borderColor: on ? '#e8732a' : '#1d211e',
              }}
            >
              {t.label}
              {count != null && <span className="font-semibold opacity-55">{count}</span>}
            </button>
          )
        })}
      </div>

      {error && <p className="font-jet rounded border border-red-500/50 bg-red-500/10 p-2 text-[12px] uppercase tracking-[0.1em] text-red-400">{error}</p>}

      {/* ---------- TORNEIOS ---------- */}
      {tab === 'torneios' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <input className="ipsc-input flex-1" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do torneio" />
            <input type="date" className="ipsc-input" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <button onClick={createTournament} className={accentBtn}>Criar</button>
          </div>

          {tournaments.length === 0
            ? <p className="ipsc-label">Sem torneios ainda.</p>
            : (
              <div className="grid gap-2.5">
                {tournaments.map(t => {
                  const tPast = isPast(t.event_date, today)
                  return (
                    <div key={t.id} className="flex flex-wrap items-center gap-4 rounded-[6px] border border-ipsc-line bg-ipsc-panel px-5 py-4" style={{ borderLeft: '3px solid #e8732a' }}>
                      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3.5 gap-y-1">
                        <span className="font-saira-cond text-[19px] font-bold">{t.name}</span>
                        <span className="font-jet text-[12px] tracking-[0.06em] text-ipsc-muted">{t.event_date}</span>
                        <span className={`font-jet text-[10px] font-bold uppercase tracking-[0.12em] ${tPast ? 'text-ipsc-muted' : 'text-ipsc-accent'}`}>{tPast ? 'Concluído' : 'Próximo'}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedId(t.id)} className={ghostBtn}>{selectedId === t.id ? 'A editar' : 'Editar'}</button>
                        {tPast
                          ? <span className="font-jet px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-ipsc-muted">Só leitura</span>
                          : <button onClick={() => deleteTournament(t.id)} className={dangerBtn}>Apagar</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          {/* selected tournament editor */}
          {draft && (
            <section className="ipsc-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-saira-cond text-[22px] font-bold">Editar — {draft.name}</h2>
                <div className="flex gap-2">
                  {!past && <button onClick={saveAndClose} className={accentBtn}>Guardar</button>}
                  <button onClick={() => setSelectedId('')} className={ghostBtn}>Fechar</button>
                </div>
              </div>
              {past ? (
                <div className="flex flex-col gap-2 font-saira text-ipsc-text">
                  <p className="ipsc-label normal-case tracking-normal text-ipsc-muted">Este torneio já passou e está bloqueado (só leitura).</p>
                  <p>Data: <span className="text-ipsc-muted2">{draft.event_date}</span></p>
                  <p>Inscrições: <span className="text-ipsc-muted2">{draft.enroll_start ?? '—'} → {draft.enroll_end ?? '—'}</span></p>
                  <p>Stages: <span className="text-ipsc-muted2">{draft.stage_names.map((n, i) => `${n} (${draft.stage_targets?.[i] ?? 0} alvos, ${draft.stage_weapon_changes[i] ?? 0} trocas)`).join(', ')}</span></p>
                  <p>Segundos por troca de arma: <span className="text-ipsc-muted2">{draft.single_weapon_seconds_per_change}</span></p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    <input className="ipsc-input flex-1" value={draft.name}
                      onChange={e => patchDraft({ name: e.target.value })}
                      onBlur={() => saveDraft({ name: draft.name })} />
                    <input type="date" className="ipsc-input" value={draft.event_date}
                      onChange={e => patchDraft({ event_date: e.target.value })}
                      onBlur={() => saveDraft({ event_date: draft.event_date })} />
                  </div>

                  <div>
                    <div className="ipsc-label mb-1.5">Janela de inscrições</div>
                    <div className="flex flex-wrap gap-3">
                      <label className="font-jet flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-ipsc-muted2">
                        Início
                        <input type="date" className="ipsc-input" value={draft.enroll_start ?? ''}
                          onChange={e => patchDraft({ enroll_start: e.target.value || null })}
                          onBlur={() => saveDraft({ enroll_start: draft.enroll_start })} />
                      </label>
                      <label className="font-jet flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-ipsc-muted2">
                        Fim
                        <input type="date" className="ipsc-input" value={draft.enroll_end ?? ''}
                          onChange={e => patchDraft({ enroll_end: e.target.value || null })}
                          onBlur={() => saveDraft({ enroll_end: draft.enroll_end })} />
                      </label>
                      <label className="font-jet flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-ipsc-muted2">
                        Lotação
                        <input type="number" min="0" className="ipsc-input w-24" placeholder="—" value={draft.capacity ?? ''}
                          onChange={e => { const n = Number(e.target.value); patchDraft({ capacity: e.target.value === '' ? null : (Number.isFinite(n) && n >= 0 ? n : 0) }) }}
                          onBlur={() => saveDraft({ capacity: draft.capacity })} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <div className="ipsc-label mb-1.5">Stages</div>
                    <div className="mb-1 flex gap-2">
                      <span className="font-jet flex-1 text-[10px] uppercase tracking-[0.14em] text-ipsc-muted">Nome do stage</span>
                      <span className="font-jet w-24 text-[10px] uppercase tracking-[0.14em] text-ipsc-muted">Alvos</span>
                      <span className="font-jet w-24 text-[10px] uppercase tracking-[0.14em] text-ipsc-muted">Trocas</span>
                    </div>
                    <div className="grid gap-2">
                      {draft.stage_names.map((name, i) => (
                        <div key={i} className="flex gap-2">
                          <input className="ipsc-input flex-1" value={name}
                            onChange={e => { const next = [...draft.stage_names]; next[i] = e.target.value; patchDraft({ stage_names: next }) }}
                            onBlur={() => saveDraft({ stage_names: draft.stage_names })} />
                          <input type="number" min="0" className="ipsc-input w-24" title="Número de alvos"
                            value={draft.stage_targets?.[i] ?? 0}
                            onChange={e => { const n = Number(e.target.value); const v = Number.isFinite(n) && n >= 0 ? n : 0; const next = draft.stage_names.map((_, idx) => idx === i ? v : (draft.stage_targets?.[idx] ?? 0)); patchDraft({ stage_targets: next }) }}
                            onBlur={() => saveDraft({ stage_targets: draft.stage_targets })} />
                          <input type="number" min="0" className="ipsc-input w-24" title="Trocas de arma"
                            value={draft.stage_weapon_changes[i] ?? 0}
                            onChange={e => { const n = Number(e.target.value); const v = Number.isFinite(n) && n >= 0 ? n : 0; const next = draft.stage_names.map((_, idx) => idx === i ? v : (draft.stage_weapon_changes[idx] ?? 0)); patchDraft({ stage_weapon_changes: next }) }}
                            onBlur={() => saveDraft({ stage_weapon_changes: draft.stage_weapon_changes })} />
                          <Link to={`/manage/stage-layout/${draft.id}/${i + 1}`} title="Editar layout" className="font-jet flex shrink-0 items-center rounded-[4px] border border-ipsc-line2 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-ipsc-muted2 transition-colors hover:text-ipsc-text">Layout</Link>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={addStage} className={accentBtn}>Adicionar stage</button>
                      {draft.stage_names.length > 1 && <button onClick={removeLastStage} className={dangerBtn}>Remover último</button>}
                    </div>
                  </div>

                  <label className="font-jet flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-ipsc-muted2">
                    Segundos por troca de arma:
                    <input type="number" min="0" className="ipsc-input w-24" value={draft.single_weapon_seconds_per_change}
                      onChange={e => { const n = Number(e.target.value); patchDraft({ single_weapon_seconds_per_change: Number.isFinite(n) && n >= 0 ? n : 0 }) }}
                      onBlur={() => saveDraft({ single_weapon_seconds_per_change: draft.single_weapon_seconds_per_change })} />
                  </label>

                  <p className="font-jet text-[11px] text-ipsc-muted">As inscrições são geridas no separador <span className="text-ipsc-accent">Inscrições</span>.</p>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ---------- INSCRIÇÕES ---------- */}
      {tab === 'inscricoes' && (
        <div className="flex flex-col gap-5">
          {/* tournament selector + stat tiles */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[6px] border border-ipsc-line2 bg-ipsc-panel p-3.5">
              <div className="font-jet mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-ipsc-muted">Torneio ativo</div>
              <select
                className="font-saira-cond w-full cursor-pointer bg-transparent text-[18px] font-bold text-ipsc-text outline-none"
                value={enrollTid}
                onChange={e => { setEnrollTid(e.target.value); setEnrollSel(''); setEnrollNew('') }}
              >
                <option value="" className="bg-ipsc-panel">— Escolher —</option>
                {tournaments.map(t => <option key={t.id} value={t.id} className="bg-ipsc-panel">{t.name} ({t.event_date})</option>)}
              </select>
            </div>
            {enrollTid && [
              { label: 'Confirmadas', value: enrollConfirmed, color: '#6fae84' },
              { label: 'Provisórias', value: enrollProvisional, color: '#e8732a' },
              { label: 'Vagas livres', value: enrollVacancies != null ? enrollVacancies : '—', color: '#fff' },
            ].map(s => (
              <div key={s.label} className="rounded-[6px] border border-ipsc-line bg-ipsc-panel p-3.5">
                <div className="font-jet mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-ipsc-muted">{s.label}</div>
                <div className="font-saira-cond text-[28px] font-extrabold leading-none" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {!enrollTid
            ? <p className="ipsc-label">Escolhe um torneio para gerir as inscrições.</p>
            : (
              <>
                {/* capacity bar */}
                {enrollCapacity != null && (
                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="ipsc-label">Lotação</span>
                      <span className="font-jet text-[10px] tracking-[0.08em] text-ipsc-muted">{enrollments.length} / {enrollCapacity} · {enrollPct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-[4px] border border-ipsc-line bg-ipsc-panel">
                      <div className="h-full bg-ipsc-accent" style={{ width: `${enrollPct}%` }} />
                    </div>
                  </div>
                )}

                {/* enroll a shooter */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <div className="ipsc-label">A · Atirador existente</div>
                    <div className="flex gap-2">
                      <select className="ipsc-input flex-1" value={enrollSel} onChange={e => setEnrollSel(e.target.value)}>
                        <option value="">Selecionar atirador…</option>
                        {enrollAvailable.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button onClick={enrollExisting} disabled={!enrollSel} className={`${accentBtn} disabled:cursor-not-allowed disabled:opacity-50`}>Inscrever</button>
                    </div>
                    <p className="font-jet text-[10px] text-ipsc-muted">Entra como inscrição provisória até confirmação.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="ipsc-label">B · Novo atirador</div>
                    <div className="flex gap-2">
                      <input className="ipsc-input flex-1" value={enrollNew} onChange={e => setEnrollNew(e.target.value)} placeholder="Nome do novo atirador" />
                      <button onClick={enrollNewPlayer} className={accentBtn}>Adicionar</button>
                    </div>
                    <p className="font-jet text-[10px] text-ipsc-muted">Cria o atleta no sistema e inscreve-o de imediato.</p>
                  </div>
                </div>

                {/* enrolled list */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="ipsc-label">Atletas inscritos</span>
                    <span className="font-jet text-[10px] uppercase tracking-[0.1em] text-ipsc-muted">Confirmadas primeiro</span>
                  </div>
                  {enrollOrdered.length === 0
                    ? <div className="rounded-[6px] border border-dashed border-ipsc-line2 p-9 text-center font-jet text-[12px] text-ipsc-muted">Sem inscrições para este torneio.</div>
                    : (
                      <div className="grid gap-2.5">
                        {enrollOrdered.map(e => {
                          const conf = e.status === 'confirmed'
                          return (
                            <div key={e.player.id} className="flex flex-wrap items-center gap-3 rounded-[6px] border border-ipsc-line bg-ipsc-panel px-4 py-3.5" style={{ borderLeft: `3px solid ${conf ? '#3a6b4a' : '#e8732a'}` }}>
                              <div className="font-jet flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border text-[12px] font-bold text-[#cfd2cc]" style={conf ? { background: '#0f1a13', borderColor: '#1d3324' } : { background: '#1a1109', borderColor: '#3a2417' }}>{initials(e.player.name)}</div>
                              <div className="min-w-0 flex-1">
                                <div className="font-saira-cond text-[19px] font-bold leading-tight">{e.player.name}</div>
                                <div className="font-jet text-[11px] tracking-[0.06em] text-ipsc-muted">{regCode(e.player.reg_no)}</div>
                              </div>
                              <span className="font-jet rounded-[3px] border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em]" style={conf ? { color: '#6fae84', borderColor: '#16321f', background: '#0a1810' } : { color: '#e8732a', borderColor: '#3a2417', background: '#170f0a' }}>{conf ? 'Confirmada' : 'Provisória'}</span>
                              <button onClick={() => toggleEnroll(e.player.id, e.status)} className="font-jet cursor-pointer rounded-[4px] border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors" style={conf ? { color: '#9aa09a', borderColor: '#2c322c' } : { color: '#6fae84', borderColor: '#16321f' }}>{conf ? 'Tornar prov.' : 'Confirmar'}</button>
                              <button onClick={() => removeEnroll(e.player.id)} className={dangerBtn}>Remover</button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                </div>
              </>
            )}
        </div>
      )}

      {/* ---------- ATIRADORES ---------- */}
      {tab === 'atiradores' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input className="ipsc-input flex-1" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Nome do atirador" />
            <button onClick={addPlayer} className={accentBtn}>Adicionar</button>
          </div>
          {players.length === 0
            ? <p className="ipsc-label">Sem atiradores ainda.</p>
            : (
              <div className="overflow-hidden rounded-[6px] border border-ipsc-line">
                {players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 border-b border-[#15180f] px-4 py-3.5 last:border-b-0">
                    <div className="font-jet flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-[#262b22] bg-[#1a1e18] text-[11px] font-semibold text-ipsc-muted2">{initials(p.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[16px] font-semibold">{p.name}</div>
                      <div className="font-jet text-[11px] text-ipsc-muted">{regCode(p.reg_no)}</div>
                    </div>
                    <button onClick={() => run(async () => { try { await data.deletePlayer(p.id) } catch { throw new Error('Não é possível remover um atirador com resultados registados.') } })} className={dangerBtn}>Remover</button>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* ---------- JUÍZES ---------- */}
      {tab === 'juizes' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input className="ipsc-input flex-1" value={judgeName} onChange={e => setJudgeName(e.target.value)} placeholder="Nome do juiz" />
            <button onClick={addJudge} className={accentBtn}>Adicionar</button>
          </div>
          {judges.length === 0
            ? <p className="ipsc-label">Sem juízes ainda.</p>
            : (
              <div className="overflow-hidden rounded-[6px] border border-ipsc-line">
                {judges.map(j => (
                  <div key={j.id} className="flex items-center gap-3 border-b border-[#15180f] px-4 py-3.5 last:border-b-0">
                    <div className="font-jet flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-[#262b22] bg-[#1a1e18] text-[11px] font-semibold text-ipsc-muted2">{initials(j.name)}</div>
                    <span className="flex-1 text-[16px] font-semibold">{j.name}</span>
                    <button onClick={() => run(async () => { try { await data.deleteJudge(j.id) } catch { throw new Error('Não é possível remover um juiz com resultados registados.') } })} className={dangerBtn}>Remover</button>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* toast */}
      {toast && (
        <div
          className="font-jet fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[6px] border px-5 py-3 text-[12px] font-bold uppercase tracking-[0.1em] shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
          style={toast.kind === 'success'
            ? { color: '#6fae84', borderColor: '#16321f', background: '#0a1810' }
            : { color: '#e0524a', borderColor: '#3a1d1b', background: '#180c0b' }}
          role="status"
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
