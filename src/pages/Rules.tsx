import { useLanguage } from '../lib/i18n'

const content = {
  en: {
    title: 'Rules & scoring',
    intro: (
      <>
        4 stages. Each stage is scored by <b className="text-ipsc-text">Hit Factor</b> = Points ÷ Time.
        Stage points give 100 to the best Hit Factor and proportional to the rest.
        The overall ranking is the sum of the points from the 4 stages.
      </>
    ),
    zoneHeading: 'Scoring by zone',
    zoneCols: ['Zone', 'Major Factor (GBBR)', 'Minor Factor (AEG/HPA)'],
    zones: [
      ['Alpha', '5', '5'],
      ['Charlie', '4', '3'],
      ['Delta', '2', '1'],
      ['Metal', '5', '5'],
    ],
    penaltyHeading: 'Penalties',
    penaltyCols: ['Description', 'Value', 'Applies to'],
    penalties: [
      ['Hit on a forbidden target (No-shoot)', '−10', 'Per hit'],
      ['Missed target (miss)', '−10', 'Per target'],
      ['Not shooting / ignored target', '−10', 'Per target'],
      ['Safety / procedure fault', '−10', 'Per occurrence'],
      ['Crossing the firing zone', '−10', 'Per occurrence'],
      ['Shooting after hitting the final target', '−10', 'Per occurrence'],
    ],
    singleWeapon: 'Single weapon: a time penalty added to the stage time (value set by the organisation).',
  },
  pt: {
    title: 'Regras & pontuação',
    intro: (
      <>
        4 etapas. Cada etapa é pontuada por <b className="text-ipsc-text">Fator de Acerto</b> = Pontos ÷ Tempo.
        Os pontos da etapa dão 100 ao melhor Fator de Acerto e proporcional aos restantes.
        A classificação geral é a soma dos pontos das 4 etapas.
      </>
    ),
    zoneHeading: 'Pontuação por zona',
    zoneCols: ['Zona', 'Fator Maior (GBBR)', 'Fator Menor (AEG/HPA)'],
    zones: [
      ['Alpha', '5', '5'],
      ['Charlie', '4', '3'],
      ['Delta', '2', '1'],
      ['Metal', '5', '5'],
    ],
    penaltyHeading: 'Penalizações',
    penaltyCols: ['Descrição', 'Valor', 'Aplica-se a'],
    penalties: [
      ['Acerto em alvo proibido (No-shoot)', '−10', 'Por acerto'],
      ['Alvo falhado (miss)', '−10', 'Por alvo'],
      ['Não disparar / alvo ignorado', '−10', 'Por alvo'],
      ['Falha de segurança / procedimento', '−10', 'Por ocorrência'],
      ['Atravessar a zona de tiro', '−10', 'Por ocorrência'],
      ['Disparar após atingir o alvo final', '−10', 'Por ocorrência'],
    ],
    singleWeapon: 'Arma única: uma penalização de tempo adicionada ao tempo da etapa (valor definido pela organização).',
  },
} as const

export default function Rules() {
  const { lang } = useLanguage()
  const t = content[lang]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="ipsc-eyebrow mb-2">Regulamento</div>
        <h1 className="ipsc-h1">{t.title}</h1>
      </div>

      <p className="font-saira text-ipsc-muted2">{t.intro}</p>

      <section className="flex flex-col gap-3">
        <h2 className="font-saira-cond text-[22px] font-bold">{t.zoneHeading}</h2>
        <div className="ipsc-panel overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ipsc-line bg-ipsc-panel text-left">
                {t.zoneCols.map(c => <th key={c} className="ipsc-th">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {t.zones.map(z => (
                <tr key={z[0]} className="border-b border-[#15180f] last:border-b-0">
                  <td className="ipsc-td font-jet uppercase tracking-[0.08em]">{z[0]}</td><td className="ipsc-td font-saira-cond text-[18px] font-bold text-ipsc-accent">{z[1]}</td><td className="ipsc-td font-saira-cond text-[18px] font-bold text-ipsc-accent">{z[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-saira-cond text-[22px] font-bold">{t.penaltyHeading}</h2>
        <div className="ipsc-panel overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ipsc-line bg-ipsc-panel text-left">
                {t.penaltyCols.map(c => <th key={c} className="ipsc-th">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {t.penalties.map(p => (
                <tr key={p[0]} className="border-b border-[#15180f] last:border-b-0">
                  <td className="ipsc-td">{p[0]}</td><td className="ipsc-td font-saira-cond text-[18px] font-bold text-red-500">{p[1]}</td><td className="ipsc-td font-jet text-[12px] text-ipsc-muted2">{p[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-saira text-[14px] text-ipsc-muted2">{t.singleWeapon}</p>
      </section>
    </div>
  )
}
