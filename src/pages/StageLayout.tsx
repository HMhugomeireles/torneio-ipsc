import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { StageLayoutItem } from '../types'
import * as data from '../lib/data'

type Tool = 'select' | 'eraser' | 'zonas' | 'limitado' | 'proibido' | 'metalico' | 'final' | 'zona' | 'inicio' | 'parede' | 'arma' | 'texto'

const DEFS: Record<string, { kind: 'point' | 'rect' | 'text'; w: number; h: number }> = {
  zonas: { kind: 'point', w: 22, h: 22 }, limitado: { kind: 'point', w: 22, h: 22 }, proibido: { kind: 'point', w: 20, h: 20 },
  metalico: { kind: 'point', w: 16, h: 16 }, final: { kind: 'point', w: 22, h: 22 },
  zona: { kind: 'rect', w: 150, h: 100 }, inicio: { kind: 'rect', w: 96, h: 46 }, parede: { kind: 'rect', w: 160, h: 9 }, arma: { kind: 'rect', w: 66, h: 42 },
  texto: { kind: 'text', w: 120, h: 24 },
}

// Sectors that can require a primary/secondary weapon.
const AREA_TYPES = new Set(['zona', 'inicio'])
const WEAPON_LABEL = { primary: '1.ª ARMA', secondary: '2.ª ARMA' } as const
const WEAPON_COLOR = { primary: '#e8732a', secondary: '#7d94a8' } as const

function deco(type: string): CSSProperties {
  switch (type) {
    case 'zonas': return { transform: 'rotate(45deg)', border: '2px solid #c98a3a', background: 'transparent' }
    case 'limitado': return { transform: 'rotate(45deg)', background: '#c98a3a', border: '2px solid #c98a3a' }
    case 'proibido': return { borderRadius: '50%', border: '2px solid #c4554d', background: 'transparent' }
    case 'metalico': return { borderRadius: '50%', background: '#3f6f99', border: '1px solid #6f9cc4' }
    case 'final': return { border: '2px solid #c4554d', background: '#1c0f0e', borderRadius: '2px' }
    case 'zona': return { background: 'rgba(45,85,120,.30)', border: '1px solid #325a78', borderRadius: '2px' }
    case 'inicio': return { background: 'rgba(40,110,70,.30)', border: '1px solid #2f6b46', borderRadius: '2px' }
    case 'parede': return { background: '#cdd0ca', borderRadius: '2px' }
    case 'arma': return { background: '#0f120e', border: '1px solid #3a4138', borderRadius: '3px' }
    default: return {}
  }
}

const ICON_DIM: Record<string, [number, number]> = {
  zonas: [13, 13], limitado: [13, 13], proibido: [13, 13], metalico: [11, 11], final: [13, 13],
  zona: [22, 13], inicio: [22, 13], parede: [20, 7], arma: [20, 13],
}

const PALETTE: { key: Tool; name: string; header?: string; glyph?: string }[] = [
  { key: 'select', name: 'Selecionar / mover', header: 'Ferramentas', glyph: '➤' },
  { key: 'eraser', name: 'Apagar', glyph: '⌫' },
  { key: 'zonas', name: 'Alvo de cartão (zonas)', header: 'Alvos' },
  { key: 'limitado', name: 'Alvo de cartão limitado' },
  { key: 'proibido', name: 'Alvo proibido (no-shoot)' },
  { key: 'metalico', name: 'Alvo metálico' },
  { key: 'final', name: 'Alvo final do stage' },
  { key: 'zona', name: 'Zona de tiro', header: 'Áreas & cenário' },
  { key: 'inicio', name: 'Início' },
  { key: 'parede', name: 'Parede' },
  { key: 'arma', name: 'Arma (pickup)' },
  { key: 'texto', name: 'Texto', header: 'Anotações', glyph: 'T' },
]

export default function StageLayout() {
  const { id = '', stage = '1' } = useParams()
  const stageNum = Number(stage)
  const canvasRef = useRef<HTMLDivElement>(null)
  const nidRef = useRef(1)

  const [name, setName] = useState('')
  const [tool, setTool] = useState<Tool>('zonas')
  const [items, setItems] = useState<StageLayoutItem[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    (async () => {
      const t = await data.getTournament(id)
      setName(t?.stage_names[stageNum - 1] ?? `Stage ${stageNum}`)
      const layout = await data.getStageLayout(id, stageNum)
      setItems(layout)
      nidRef.current = layout.reduce((m, i) => Math.max(m, i.id), 0) + 1
      setLoading(false)
    })()
  }, [id, stageNum])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function pt(e: { clientX: number; clientY: number }) {
    const el = canvasRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    const sc = el.offsetWidth ? r.width / el.offsetWidth : 1
    return { x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc }
  }

  function placeAt(e: React.MouseEvent) {
    if (tool === 'select' || tool === 'eraser') { setSel(null); return }
    const def = DEFS[tool]; if (!def) return
    const p = pt(e)
    const id2 = nidRef.current
    nidRef.current += 1
    const base: StageLayoutItem = { id: id2, type: tool, x: Math.round(p.x - def.w / 2), y: Math.round(p.y - def.h / 2), w: def.w, h: def.h }
    const created = tool === 'texto' ? { ...base, text: 'Texto' } : tool === 'arma' ? { ...base, text: 'Arma' } : base
    setItems(s => [...s, created])
    setSel(id2)
  }

  function updateSel(patch: Partial<StageLayoutItem>) {
    setItems(s => s.map(i => i.id === sel ? { ...i, ...patch } : i))
  }

  function startDrag(e: React.MouseEvent, itemId: number) {
    const it = items.find(i => i.id === itemId)
    if (!it) return
    const start = pt(e)
    const orig = { x: it.x, y: it.y }
    setSel(itemId)
    const move = (ev: MouseEvent) => {
      const p = pt(ev)
      const dx = p.x - start.x, dy = p.y - start.y
      setItems(s => s.map(i => i.id === itemId ? { ...i, x: Math.round(orig.x + dx), y: Math.round(orig.y + dy) } : i))
    }
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  function onItemDown(e: React.MouseEvent, itemId: number) {
    e.stopPropagation()
    if (tool === 'eraser') { setItems(s => s.filter(i => i.id !== itemId)); setSel(null); return }
    startDrag(e, itemId)
  }

  function startResize(e: React.MouseEvent) {
    e.stopPropagation()
    const it = items.find(i => i.id === sel)
    if (!it) return
    const start = pt(e)
    const orig = { w: it.w, h: it.h }
    const move = (ev: MouseEvent) => {
      const p = pt(ev)
      const dw = p.x - start.x, dh = p.y - start.y
      setItems(s => s.map(i => i.id === sel ? { ...i, w: Math.max(18, Math.round(orig.w + dw)), h: Math.max(8, Math.round(orig.h + dh)) } : i))
    }
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  function deleteSel() { setItems(s => s.filter(i => i.id !== sel)); setSel(null) }

  async function save() {
    try {
      await data.saveStageLayout(id, stageNum, items)
      const t = await data.getTournament(id)
      if (t && name.trim() && t.stage_names[stageNum - 1] !== name) {
        const names = [...t.stage_names]; names[stageNum - 1] = name.trim()
        await data.updateTournament(id, { stage_names: names })
      }
      setToast({ kind: 'success', msg: 'Stage guardado.' })
    } catch (e) {
      setToast({ kind: 'error', msg: 'Erro ao guardar: ' + String(e) })
    }
  }

  const selItem = items.find(i => i.id === sel) ?? null
  const selResizable = !!(selItem && DEFS[selItem.type]?.kind === 'rect')
  const curToolName = PALETTE.find(p => p.key === tool)?.name ?? '—'

  if (loading) return <p className="ipsc-label">A carregar…</p>

  return (
    <div className="flex flex-col gap-4">
      {/* title / actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ipsc-line pb-4">
        <div>
          <div className="ipsc-eyebrow mb-2">Editor de stages</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full max-w-[340px] border-b border-transparent bg-transparent font-saira-cond text-[30px] font-extrabold leading-none text-white outline-none focus:border-ipsc-line2"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-jet mr-1 text-[11px] text-ipsc-muted">{items.length} elementos · {curToolName.toLowerCase()}</span>
          <Link to="/manage" className="font-jet cursor-pointer rounded-[4px] border border-ipsc-line2 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#cfd2cc] transition-colors hover:border-ipsc-muted2">← Voltar</Link>
          <button onClick={() => { setItems(s => s.slice(0, -1)); setSel(null) }} className="font-jet cursor-pointer rounded-[4px] border border-ipsc-line2 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#cfd2cc] transition-colors hover:border-ipsc-muted2">↶ Anular</button>
          <button onClick={() => { setItems([]); setSel(null) }} className="font-jet cursor-pointer rounded-[4px] border border-red-500/40 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-red-400 transition-colors hover:bg-red-500 hover:text-white">Limpar tudo</button>
          <button onClick={save} className="ipsc-btn px-4 py-2.5 text-[12px]">Guardar stage</button>
        </div>
      </div>

      {/* selected element properties */}
      {selItem && (
        <div className="flex flex-wrap items-center gap-3 rounded-[6px] border border-ipsc-line bg-ipsc-panel px-4 py-3">
          <span className="font-jet text-[10px] font-bold uppercase tracking-[0.12em] text-ipsc-muted">{PALETTE.find(p => p.key === selItem.type)?.name ?? selItem.type}</span>
          {(selItem.type === 'texto' || selItem.type === 'arma') && (
            <input value={selItem.text ?? ''} onChange={e => updateSel({ text: e.target.value })} placeholder={selItem.type === 'arma' ? 'Identificação da arma…' : 'Texto…'} className="ipsc-input min-w-[160px] flex-1" />
          )}
          {AREA_TYPES.has(selItem.type) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-jet text-[10px] uppercase tracking-[0.1em] text-ipsc-muted2">Arma:</span>
              {([['none', 'Nenhuma'], ['primary', 'Primária'], ['secondary', 'Secundária']] as const).map(([val, label]) => {
                const on = (selItem.weapon ?? 'none') === val
                return (
                  <button
                    key={val}
                    onClick={() => updateSel({ weapon: val === 'none' ? undefined : val })}
                    className="font-jet cursor-pointer rounded-[3px] border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors"
                    style={on ? { background: '#e8732a', color: '#0d100e', borderColor: '#e8732a' } : { color: '#9aa09a', borderColor: '#1d211e' }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
          <button onClick={deleteSel} className="ipsc-btn-danger ml-auto">Remover</button>
        </div>
      )}

      {/* palette + canvas */}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* palette */}
        <div className="flex flex-col gap-1 rounded-[6px] border border-ipsc-line p-3">
          {PALETTE.map(p => {
            const active = tool === p.key
            return (
              <div key={p.key}>
                {p.header && <div className="font-jet mb-1.5 mt-3 px-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#5a605a] first:mt-0">{p.header}</div>}
                <button
                  onClick={() => { setTool(p.key); setSel(null) }}
                  className="flex w-full items-center gap-3 rounded-[5px] border px-3 py-2.5 text-left transition-colors"
                  style={{ background: active ? '#170f0a' : 'transparent', borderColor: active ? '#3a2417' : '#181c17' }}
                >
                  <span className="flex w-6 items-center justify-center">
                    {p.glyph
                      ? <span className="text-[12px]" style={{ color: active ? '#e8732a' : '#9aa09a' }}>{p.glyph}</span>
                      : <span style={{ width: ICON_DIM[p.key][0], height: ICON_DIM[p.key][1], boxSizing: 'border-box', ...deco(p.key) }} />}
                  </span>
                  <span className="font-saira text-[14px] font-semibold" style={{ color: active ? '#fff' : '#cfd2cc' }}>{p.name}</span>
                </button>
              </div>
            )
          })}
          <p className="font-jet mt-4 border-t border-[#181c17] pt-3 text-[10px] leading-[1.6] text-[#5a605a]">
            Clica num elemento e depois no mapa para o colocar. Arrasta para mover · usa o canto para redimensionar áreas.
          </p>
        </div>

        {/* canvas */}
        <div
          ref={canvasRef}
          onMouseDown={placeAt}
          className="relative select-none overflow-hidden rounded-[6px] border border-ipsc-line"
          style={{
            height: 640,
            background: '#0a0c0a',
            backgroundImage: 'linear-gradient(#ffffff0a 1px,transparent 1px),linear-gradient(90deg,#ffffff0a 1px,transparent 1px)',
            backgroundSize: '28px 28px',
            cursor: tool === 'select' ? 'default' : 'crosshair',
          }}
        >
          {items.map(it => (
            <div
              key={it.id}
              onMouseDown={e => onItemDown(e, it.id)}
              style={{ position: 'absolute', left: it.x, top: it.y, width: it.w, height: it.h, boxSizing: 'border-box', cursor: tool === 'eraser' ? 'crosshair' : 'move', ...deco(it.type) }}
            >
              {it.type === 'arma' && (
                <span className="font-jet absolute inset-0 flex items-center justify-center overflow-hidden px-1 text-center text-[8px] leading-tight tracking-[0.08em] text-[#9aa09a]">{it.text || 'ARMA'}</span>
              )}
              {it.type === 'texto' && (
                <span className="absolute inset-0 flex items-center overflow-hidden whitespace-nowrap font-saira text-[14px] font-semibold text-ipsc-text" style={{ pointerEvents: 'none' }}>{it.text || 'Texto'}</span>
              )}
              {AREA_TYPES.has(it.type) && it.weapon && (
                <span className="font-jet absolute left-1 top-1 rounded-[2px] px-1.5 py-0.5 text-[8px] font-bold tracking-[0.1em]" style={{ pointerEvents: 'none', color: '#0d100e', background: WEAPON_COLOR[it.weapon] }}>{WEAPON_LABEL[it.weapon]}</span>
              )}
            </div>
          ))}

          {selItem && (
            <div style={{ position: 'absolute', left: selItem.x - 4, top: selItem.y - 4, width: selItem.w + 8, height: selItem.h + 8, border: '1px dashed #e8732a', borderRadius: 3, pointerEvents: 'none', zIndex: 50 }}>
              <span
                onMouseDown={e => e.stopPropagation()}
                onClick={deleteSel}
                style={{ position: 'absolute', right: -11, top: -11, width: 22, height: 22, borderRadius: '50%', background: '#e0524a', color: '#0d100e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, cursor: 'pointer', pointerEvents: 'auto' }}
              >✕</span>
              {selResizable && (
                <span
                  onMouseDown={startResize}
                  style={{ position: 'absolute', right: -6, bottom: -6, width: 13, height: 13, background: '#e8732a', border: '1px solid #0d100e', borderRadius: 2, cursor: 'nwse-resize', pointerEvents: 'auto' }}
                />
              )}
            </div>
          )}
        </div>
      </div>

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
