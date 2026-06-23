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
      <h1 className="text-2xl font-bold">Gestão</h1>
      {error && <p className="text-red-400">{error}</p>}

      <section>
        <h2 className="mb-2 font-bold">Jogadores</h2>
        <div className="flex gap-2">
          <input className="flex-1 rounded bg-neutral-800 p-2" value={playerName}
            onChange={e => setPlayerName(e.target.value)} placeholder="Nome do jogador" />
          <button onClick={addPlayer} className="rounded bg-blue-600 px-4 font-bold">Adicionar</button>
        </div>
        <ul className="mt-2 divide-y divide-neutral-800">
          {players.map(p => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>{p.name}</span>
              <button onClick={async () => { await data.deletePlayer(p.id); reload() }}
                className="text-sm text-red-400">Remover</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Juízes</h2>
        <div className="flex gap-2">
          <input className="flex-1 rounded bg-neutral-800 p-2" value={judgeName}
            onChange={e => setJudgeName(e.target.value)} placeholder="Nome do juiz" />
          <button onClick={addJudge} className="rounded bg-blue-600 px-4 font-bold">Adicionar</button>
        </div>
        <ul className="mt-2 divide-y divide-neutral-800">
          {judges.map(j => (
            <li key={j.id} className="flex items-center justify-between py-2">
              <span>{j.name}</span>
              <button onClick={async () => { await data.deleteJudge(j.id); reload() }}
                className="text-sm text-red-400">Remover</button>
            </li>
          ))}
        </ul>
      </section>

      {settings && (
        <section>
          <h2 className="mb-2 font-bold">Definições</h2>
          <label className="flex items-center gap-2">
            Segundos por defeito (arma única):
            <input type="number" className="w-24 rounded bg-neutral-800 p-2"
              value={settings.default_single_weapon_seconds}
              onChange={e => setSettings({ ...settings, default_single_weapon_seconds: Number(e.target.value) })}
              onBlur={() => saveSettings({ default_single_weapon_seconds: settings.default_single_weapon_seconds })} />
          </label>
          <div className="mt-3 grid gap-2">
            {settings.stage_names.map((name, i) => (
              <input key={i} className="rounded bg-neutral-800 p-2" value={name}
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
