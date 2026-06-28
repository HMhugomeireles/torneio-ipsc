import { useEffect, useState } from 'react'
import type { Player, Judge, Tournament } from '../types'
import * as data from '../lib/data'
import { isPast, todayISO } from '../lib/dates'

const accentBtn = 'ipsc-btn'
const dangerBtn = 'ipsc-btn-danger'
const ghostBtn = 'ipsc-btn-ghost'
const sectionH = 'mb-3 font-saira-cond text-[22px] font-bold text-ipsc-text'

export default function Management() {
  const today = todayISO()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [enrolled, setEnrolled] = useState<Player[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState<Tournament | null>(null)

  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState(today)
  const [playerName, setPlayerName] = useState('')
  const [judgeName, setJudgeName] = useState('')
  const [enrollId, setEnrollId] = useState('')
  const [enrollNew, setEnrollNew] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    try {
      const ts = await data.getTournaments()
      setTournaments(ts)
      setPlayers(await data.getPlayers())
      setJudges(await data.getJudges())
      if (selectedId) {
        const sel = ts.find(t => t.id === selectedId) ?? null
        setDraft(sel)
        if (sel) setEnrolled(await data.getEnrolledPlayers(selectedId))
        else { setEnrolled([]); setSelectedId('') }
      } else {
        setDraft(null); setEnrolled([])
      }
    } catch (e) { setError(String(e)) }
  }
  useEffect(() => { reload() }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

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
  // stages
  async function addStage() {
    if (!draft) return
    await saveDraft({
      stage_names: [...draft.stage_names, `Stage ${draft.stage_names.length + 1}`],
      stage_weapon_changes: [...draft.stage_weapon_changes, 0],
    })
  }
  async function removeLastStage() {
    if (!draft || draft.stage_names.length <= 1) return
    const last = draft.stage_names.length
    await run(async () => {
      const n = await data.getStageResultCount(draft.id, last)
      if (n > 0) { setError('Cannot remove a stage with recorded results.'); return }
      await data.updateTournament(draft.id, {
        stage_names: draft.stage_names.slice(0, -1),
        stage_weapon_changes: draft.stage_weapon_changes.slice(0, -1),
      })
    })
  }
  // enrollment
  async function enrollExisting() {
    if (!draft || !enrollId) return
    await run(async () => { await data.enrollPlayer(draft.id, enrollId); setEnrollId('') })
  }
  async function enrollNewPlayer() {
    if (!draft || !enrollNew.trim()) return
    await run(async () => {
      const p = await data.addPlayer(enrollNew.trim())
      await data.enrollPlayer(draft.id, p.id)
      setEnrollNew('')
    })
  }
  async function removeEnrollment(pid: string) {
    if (!draft) return
    await run(async () => { await data.unenrollPlayer(draft.id, pid) })
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

  const available = players.filter(p => !enrolled.some(e => e.id === p.id))

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="ipsc-eyebrow mb-2">Administração</div>
        <h1 className="ipsc-h1">Gestão</h1>
      </div>
      {error && <p className="font-jet rounded border border-red-500/50 bg-red-500/10 p-2 text-[12px] uppercase tracking-[0.1em] text-red-400">{error}</p>}

      {/* Tournaments */}
      <section>
        <h2 className={sectionH}>Torneios</h2>
        <div className="flex flex-wrap gap-2">
          <input className="ipsc-input flex-1" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do torneio" />
          <input type="date" className="ipsc-input" value={newDate} onChange={e => setNewDate(e.target.value)} />
          <button onClick={createTournament} className={accentBtn}>Criar</button>
        </div>
        <ul className="mt-3 divide-y divide-ipsc-line">
          {tournaments.map(t => {
            const tPast = isPast(t.event_date, today)
            return (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="flex items-center gap-3">
                  <span className="font-saira-cond text-[18px] font-bold">{t.name}</span>
                  <span className="font-jet text-[11px] uppercase tracking-[0.12em] text-ipsc-muted">{t.event_date}</span>
                  <span className={`font-jet text-[11px] uppercase tracking-[0.12em] ${tPast ? 'text-ipsc-muted' : 'text-ipsc-accent'}`}>{tPast ? 'Concluído' : 'Próximo'}</span>
                </span>
                <span className="flex gap-2">
                  <button onClick={() => setSelectedId(t.id)} className={ghostBtn}>{selectedId === t.id ? 'A editar' : 'Editar'}</button>
                  {tPast
                    ? <span className="font-jet px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-ipsc-muted">Só leitura</span>
                    : <button onClick={() => deleteTournament(t.id)} className={dangerBtn}>Apagar</button>}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Selected tournament editor */}
      {draft && (
        <section className="ipsc-panel p-4">
          <h2 className={sectionH}>Editar — {draft.name}</h2>
          {past ? (
            <div className="flex flex-col gap-2 font-saira text-ipsc-text">
              <p className="ipsc-label normal-case tracking-normal text-ipsc-muted">Este torneio já passou e está bloqueado (só leitura).</p>
              <p>Data: <span className="text-ipsc-muted2">{draft.event_date}</span></p>
              <p>Stages: <span className="text-ipsc-muted2">{draft.stage_names.map((n, i) => `${n} (${draft.stage_weapon_changes[i] ?? 0} trocas)`).join(', ')}</span></p>
              <p>Segundos por troca de arma: <span className="text-ipsc-muted2">{draft.single_weapon_seconds_per_change}</span></p>
              <p>Inscritos: <span className="text-ipsc-muted2">{enrolled.map(p => p.name).join(', ') || '—'}</span></p>
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
                <div className="ipsc-label mb-1.5">Stages</div>
                <div className="grid gap-2">
                  {draft.stage_names.map((name, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="ipsc-input flex-1" value={name}
                        onChange={e => { const next = [...draft.stage_names]; next[i] = e.target.value; patchDraft({ stage_names: next }) }}
                        onBlur={() => saveDraft({ stage_names: draft.stage_names })} />
                      <input type="number" min="0" className="ipsc-input w-28" title="Trocas de arma"
                        value={draft.stage_weapon_changes[i] ?? 0}
                        onChange={e => { const n = Number(e.target.value); const v = Number.isFinite(n) && n >= 0 ? n : 0; const next = draft.stage_names.map((_, idx) => idx === i ? v : (draft.stage_weapon_changes[idx] ?? 0)); patchDraft({ stage_weapon_changes: next }) }}
                        onBlur={() => saveDraft({ stage_weapon_changes: draft.stage_weapon_changes })} />
                    </div>
                  ))}
                </div>
                <div className="font-jet mt-1.5 text-[10px] uppercase tracking-[0.14em] text-ipsc-muted">Nome do stage · trocas de arma</div>
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

              <div>
                <div className="ipsc-label mb-1.5">Atiradores inscritos</div>
                <div className="flex flex-wrap gap-2">
                  <select className="ipsc-input flex-1" value={enrollId} onChange={e => setEnrollId(e.target.value)}>
                    <option value="">— Inscrever atirador existente —</option>
                    {available.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={enrollExisting} className={accentBtn}>Inscrever</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input className="ipsc-input flex-1" value={enrollNew} onChange={e => setEnrollNew(e.target.value)} placeholder="Novo atirador" />
                  <button onClick={enrollNewPlayer} className={accentBtn}>Adicionar novo</button>
                </div>
                <ul className="mt-2 divide-y divide-ipsc-line">
                  {enrolled.map(p => (
                    <li key={p.id} className="flex items-center justify-between py-2 font-saira text-ipsc-text">
                      <span>{p.name}</span>
                      <button onClick={() => removeEnrollment(p.id)} className={dangerBtn}>Remover</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Global players */}
      <section>
        <h2 className={sectionH}>Atiradores (global)</h2>
        <div className="flex gap-2">
          <input className="ipsc-input flex-1" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Nome do atirador" />
          <button onClick={addPlayer} className={accentBtn}>Adicionar</button>
        </div>
        <ul className="mt-2 divide-y divide-ipsc-line">
          {players.map(p => (
            <li key={p.id} className="flex items-center justify-between py-2 font-saira text-ipsc-text">
              <span>{p.name}</span>
              <button onClick={() => run(async () => { try { await data.deletePlayer(p.id) } catch { throw new Error('Não é possível remover um atirador com resultados registados.') } })} className={dangerBtn}>Remover</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Global judges */}
      <section>
        <h2 className={sectionH}>Juízes (global)</h2>
        <div className="flex gap-2">
          <input className="ipsc-input flex-1" value={judgeName} onChange={e => setJudgeName(e.target.value)} placeholder="Nome do juiz" />
          <button onClick={addJudge} className={accentBtn}>Adicionar</button>
        </div>
        <ul className="mt-2 divide-y divide-ipsc-line">
          {judges.map(j => (
            <li key={j.id} className="flex items-center justify-between py-2 font-saira text-ipsc-text">
              <span>{j.name}</span>
              <button onClick={() => run(async () => { try { await data.deleteJudge(j.id) } catch { throw new Error('Não é possível remover um juiz com resultados registados.') } })} className={dangerBtn}>Remover</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
