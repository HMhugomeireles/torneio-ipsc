const zoneCols = ['Zona', 'Fator Maior (GBBR)', 'Fator Menor (AEG/HPA)']
const zones = [
  ['Alpha', '5', '5'],
  ['Charlie', '4', '3'],
  ['Delta', '2', '1'],
  ['Metal', '5', '5'],
]
const penaltyCols = ['Descrição', 'Valor', 'Aplica-se a']
const penalties = [
  ['Acerto em alvo proibido (No-shoot)', '−10', 'Por acerto'],
  ['Alvo falhado (miss)', '−10', 'Por alvo'],
  ['Não disparar / alvo ignorado', '−10', 'Por alvo'],
  ['Falha de segurança / procedimento', '−10', 'Por ocorrência'],
  ['Atravessar a zona de tiro', '−10', 'Por ocorrência'],
  ['Disparar após atingir o alvo final', '−10', 'Por ocorrência'],
]

export default function Rules() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="ipsc-eyebrow mb-2">Regulamento</div>
        <h1 className="ipsc-h1">Regras & pontuação</h1>
      </div>

      <p className="font-saira text-ipsc-muted2">
        Cada estágio é pontuado por <b className="text-ipsc-text">Fator de Acerto</b> = Pontos ÷ Tempo.
        Os pontos do estágio dão 100 ao melhor Fator de Acerto e proporcional aos restantes.
        A classificação geral é a soma dos pontos de todos os estágios.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="font-saira-cond text-[22px] font-bold">Pontuação por zona</h2>
        <div className="ipsc-panel overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ipsc-line bg-ipsc-panel text-left">
                {zoneCols.map(c => <th key={c} className="ipsc-th">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {zones.map(z => (
                <tr key={z[0]} className="border-b border-[#15180f] last:border-b-0">
                  <td className="ipsc-td font-jet uppercase tracking-[0.08em]">{z[0]}</td><td className="ipsc-td font-saira-cond text-[18px] font-bold text-ipsc-accent">{z[1]}</td><td className="ipsc-td font-saira-cond text-[18px] font-bold text-ipsc-accent">{z[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-saira-cond text-[22px] font-bold">Penalizações</h2>
        <div className="ipsc-panel overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ipsc-line bg-ipsc-panel text-left">
                {penaltyCols.map(c => <th key={c} className="ipsc-th">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {penalties.map(p => (
                <tr key={p[0]} className="border-b border-[#15180f] last:border-b-0">
                  <td className="ipsc-td">{p[0]}</td><td className="ipsc-td font-saira-cond text-[18px] font-bold text-red-500">{p[1]}</td><td className="ipsc-td font-jet text-[12px] text-ipsc-muted2">{p[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-saira-cond text-[22px] font-bold">Arma única</h2>
        <p className="font-saira text-[14px] text-ipsc-muted2">
          Cada estágio que exija troca de arma da primária para a secundária adiciona <b className="text-ipsc-text">10 segundos</b> ao tempo final por cada troca necessária.
        </p>
        <p className="font-saira text-[14px] text-ipsc-muted2">
          Exemplo: um estágio com 2 trocas de arma tem 2 × 10s = <b className="text-ipsc-text">20 segundos</b> de penalização.
        </p>
      </section>
    </div>
  )
}
