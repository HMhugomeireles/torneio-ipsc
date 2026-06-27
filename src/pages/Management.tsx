import { useEffect, useState } from 'react'
import type { Player, Judge, Tournament } from '../types'
import * as data from '../lib/data'
import { isPast, todayISO } from '../lib/dates'

const accentBtn = 'cursor-pointer bg-bullet-accent px-4 font-bold uppercase tracking-widest text-bullet-dark transition-colors hover:bg-white hover:text-black'
const dangerBtn = 'cursor-pointer border border-red-500 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-500 transition-colors hover:bg-red-500 hover:text-white'
const ghostBtn = 'cursor-pointer border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-bullet-muted transition-colors hover:text-bullet-text'
const sectionH = 'mb-2 text-sm font-bold uppercase tracking-widest text-bullet-accent'

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
    await saveDraft({ stage_names: [...draft.stage_names, `Stage ${draft.stage_names.length + 1}`] })
  }
  async function removeLastStage() {
    if (!draft || draft.stage_names.length <= 1) return
    const last = draft.stage_names.length
    await run(async () => {
      const n = await data.getStageResultCount(draft.id, last)
      if (n > 0) { setError('Cannot remove a stage with recorded results.'); return }
      await data.updateTournament(draft.id, { stage_names: draft.stage_names.slice(0, -1) })
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
      <h1 className="text-2xl font-black uppercase tracking-widest">Management</h1>
      {error && <p className="border border-red-500 bg-red-500/10 p-2 uppercase tracking-widest text-red-500">{error}</p>}

      {/* Tournaments */}
      <section>
        <h2 className={sectionH}>Tournaments</h2>
        <div className="flex flex-wrap gap-2">
          <input className="tactical-input flex-1" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Tournament name" />
          <input type="date" className="tactical-input" value={newDate} onChange={e => setNewDate(e.target.value)} />
          <button onClick={createTournament} className={accentBtn}>Create</button>
        </div>
        <ul className="mt-2 divide-y divide-white/10">
          {tournaments.map(t => {
            const tPast = isPast(t.event_date, today)
            return (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-3">
                  <span className="font-bold uppercase tracking-wider">{t.name}</span>
                  <span className="text-xs uppercase tracking-widest text-bullet-muted">{t.event_date}</span>
                  <span className={`text-xs uppercase tracking-widest ${tPast ? 'text-bullet-muted' : 'text-bullet-accent'}`}>{tPast ? 'Past' : 'Upcoming'}</span>
                </span>
                <span className="flex gap-2">
                  <button onClick={() => setSelectedId(t.id)} className={ghostBtn}>{selectedId === t.id ? 'Editing' : 'Edit'}</button>
                  {tPast
                    ? <span className="px-3 py-1 text-xs uppercase tracking-widest text-bullet-muted">Read-only</span>
                    : <button onClick={() => deleteTournament(t.id)} className={dangerBtn}>Delete</button>}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Selected tournament editor */}
      {draft && (
        <section className="tactical-panel p-4">
          <h2 className={sectionH}>Edit — {draft.name}</h2>
          {past ? (
            <div className="flex flex-col gap-2">
              <p className="uppercase tracking-widest text-bullet-muted">This tournament is in the past and is locked (read-only).</p>
              <p className="uppercase tracking-wider">Date: <span className="text-bullet-muted">{draft.event_date}</span></p>
              <p className="uppercase tracking-wider">Stages: <span className="text-bullet-muted">{draft.stage_names.join(', ')}</span></p>
              <p className="uppercase tracking-wider">Enrolled: <span className="text-bullet-muted">{enrolled.map(p => p.name).join(', ') || '—'}</span></p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <input className="tactical-input flex-1" value={draft.name}
                  onChange={e => patchDraft({ name: e.target.value })}
                  onBlur={() => saveDraft({ name: draft.name })} />
                <input type="date" className="tactical-input" value={draft.event_date}
                  onChange={e => patchDraft({ event_date: e.target.value })}
                  onBlur={() => saveDraft({ event_date: draft.event_date })} />
              </div>

              <div>
                <div className="mb-1 text-xs uppercase tracking-widest text-bullet-muted">Stages</div>
                <div className="grid gap-2">
                  {draft.stage_names.map((name, i) => (
                    <input key={i} className="tactical-input" value={name}
                      onChange={e => { const next = [...draft.stage_names]; next[i] = e.target.value; patchDraft({ stage_names: next }) }}
                      onBlur={() => saveDraft({ stage_names: draft.stage_names })} />
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={addStage} className={accentBtn}>Add stage</button>
                  {draft.stage_names.length > 1 && <button onClick={removeLastStage} className={dangerBtn}>Remove last stage</button>}
                </div>
              </div>

              <label className="flex items-center gap-2 uppercase tracking-widest text-bullet-muted">
                Default seconds (single weapon):
                <input type="number" className="tactical-input w-24" value={draft.default_single_weapon_seconds}
                  onChange={e => { const n = Number(e.target.value); patchDraft({ default_single_weapon_seconds: Number.isFinite(n) ? n : 0 }) }}
                  onBlur={() => saveDraft({ default_single_weapon_seconds: draft.default_single_weapon_seconds })} />
              </label>

              <div>
                <div className="mb-1 text-xs uppercase tracking-widest text-bullet-muted">Enrolled players</div>
                <div className="flex flex-wrap gap-2">
                  <select className="tactical-input flex-1" value={enrollId} onChange={e => setEnrollId(e.target.value)}>
                    <option value="">— Enroll existing player —</option>
                    {available.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={enrollExisting} className={accentBtn}>Add</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input className="tactical-input flex-1" value={enrollNew} onChange={e => setEnrollNew(e.target.value)} placeholder="New player name" />
                  <button onClick={enrollNewPlayer} className={accentBtn}>Add new</button>
                </div>
                <ul className="mt-2 divide-y divide-white/10">
                  {enrolled.map(p => (
                    <li key={p.id} className="flex items-center justify-between py-2">
                      <span className="uppercase tracking-wider">{p.name}</span>
                      <button onClick={() => removeEnrollment(p.id)} className={dangerBtn}>Remove</button>
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
        <h2 className={sectionH}>Players (global)</h2>
        <div className="flex gap-2">
          <input className="tactical-input flex-1" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Player name" />
          <button onClick={addPlayer} className={accentBtn}>Add</button>
        </div>
        <ul className="mt-2 divide-y divide-white/10">
          {players.map(p => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span className="uppercase tracking-wider">{p.name}</span>
              <button onClick={() => run(async () => { try { await data.deletePlayer(p.id) } catch { throw new Error('Cannot remove a player with recorded results.') } })} className={dangerBtn}>Remove</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Global judges */}
      <section>
        <h2 className={sectionH}>Judges (global)</h2>
        <div className="flex gap-2">
          <input className="tactical-input flex-1" value={judgeName} onChange={e => setJudgeName(e.target.value)} placeholder="Judge name" />
          <button onClick={addJudge} className={accentBtn}>Add</button>
        </div>
        <ul className="mt-2 divide-y divide-white/10">
          {judges.map(j => (
            <li key={j.id} className="flex items-center justify-between py-2">
              <span className="uppercase tracking-wider">{j.name}</span>
              <button onClick={() => run(async () => { try { await data.deleteJudge(j.id) } catch { throw new Error('Cannot remove a judge with recorded results.') } })} className={dangerBtn}>Remove</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
