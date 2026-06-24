import { useEffect, useState } from 'react'
import type { Player, Judge, TournamentSettings } from '../types'
import * as data from '../lib/data'

export default function Gestao() {
  const [players, setPlayers] = useState<Player[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [settings, setSettings] = useState<TournamentSettings | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [judgeName, setJudgeName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    try {
      setPlayers(await data.getPlayers())
      setJudges(await data.getJudges())
      setSettings(await data.getSettings())
    } catch (e) { setError(String(e)) }
  }
  useEffect(() => { reload() }, [])

  async function addPlayer() {
    if (!playerName.trim()) return
    await data.addPlayer(playerName.trim()); setPlayerName(''); reload()
  }
  async function addJudge() {
    if (!judgeName.trim()) return
    await data.addJudge(judgeName.trim()); setJudgeName(''); reload()
  }
  async function saveSettings(patch: Partial<TournamentSettings>) {
    await data.updateSettings(patch); reload()
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-black uppercase tracking-widest">Gestão</h1>
      {error && <p className="border border-red-500 bg-red-500/10 p-2 uppercase tracking-widest text-red-500">{error}</p>}

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-bullet-accent">Jogadores</h2>
        <div className="flex gap-2">
          <input className="tactical-input flex-1" value={playerName}
            onChange={e => setPlayerName(e.target.value)} placeholder="Nome do jogador" />
          <button onClick={addPlayer} className="cursor-pointer bg-bullet-accent px-4 font-bold uppercase tracking-widest text-bullet-dark transition-colors hover:bg-white hover:text-black">Adicionar</button>
        </div>
        <ul className="mt-2 divide-y divide-white/10">
          {players.map(p => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span className="uppercase tracking-wider">{p.name}</span>
              <button onClick={async () => { try { await data.deletePlayer(p.id); reload() } catch (e) { setError(String(e)) } }}
                className="cursor-pointer border border-red-500 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-500 transition-colors hover:bg-red-500 hover:text-white">Remover</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-bullet-accent">Juízes</h2>
        <div className="flex gap-2">
          <input className="tactical-input flex-1" value={judgeName}
            onChange={e => setJudgeName(e.target.value)} placeholder="Nome do juiz" />
          <button onClick={addJudge} className="cursor-pointer bg-bullet-accent px-4 font-bold uppercase tracking-widest text-bullet-dark transition-colors hover:bg-white hover:text-black">Adicionar</button>
        </div>
        <ul className="mt-2 divide-y divide-white/10">
          {judges.map(j => (
            <li key={j.id} className="flex items-center justify-between py-2">
              <span className="uppercase tracking-wider">{j.name}</span>
              <button onClick={async () => { try { setError(null); await data.deleteJudge(j.id); reload() } catch { setError('Não é possível remover um juiz com resultados registados.') } }}
                className="cursor-pointer border border-red-500 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-500 transition-colors hover:bg-red-500 hover:text-white">Remover</button>
            </li>
          ))}
        </ul>
      </section>

      {settings && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-bullet-accent">Definições</h2>
          <label className="flex items-center gap-2 uppercase tracking-widest text-bullet-muted">
            Segundos por defeito (arma única):
            <input type="number" className="tactical-input w-24"
              value={settings.default_single_weapon_seconds}
              onChange={e => { const n = Number(e.target.value); setSettings({ ...settings, default_single_weapon_seconds: Number.isFinite(n) ? n : 0 }) }}
              onBlur={() => saveSettings({ default_single_weapon_seconds: settings.default_single_weapon_seconds })} />
          </label>
          <div className="mt-3 grid gap-2">
            {settings.stage_names.map((name, i) => (
              <input key={i} className="tactical-input" value={name}
                onChange={e => {
                  const next = [...settings.stage_names]; next[i] = e.target.value
                  setSettings({ ...settings, stage_names: next })
                }}
                onBlur={() => saveSettings({ stage_names: settings.stage_names })} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
