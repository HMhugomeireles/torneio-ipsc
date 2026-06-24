const zonas = [
  ['Alpha', '5', '5'],
  ['Charlie', '4', '3'],
  ['Delta', '2', '1'],
  ['Metal', '5', '5'],
]
const penalizacoes = [
  ['Acertar em alvo proibido (No-shoot)', '−10', 'Por impacto'],
  ['Falha no alvo (miss)', '−10', 'Por alvo'],
  ['Não disparar / alvo ignorado', '−10', 'Por alvo'],
  ['Falha de segurança / procedimento', '−10', 'Por ocorrência'],
  ['Ultrapassar a zona de disparo', '−10', 'Por ocorrência'],
  ['Disparar depois de acertar no alvo final', '−10', 'Por ocorrência'],
]

export default function Regras() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black uppercase tracking-widest">Regras &amp; pontuação</h1>

      <p className="text-bullet-muted">
        4 estágios. Cada estágio é pontuado por <b className="text-bullet-text">Hit Factor</b> = Pontos ÷ Tempo.
        Os pontos do estágio dão 100 ao melhor Hit Factor e proporcional aos restantes.
        A classificação geral é a soma dos pontos dos 4 estágios.
      </p>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-bullet-accent">Pontuação por zona</h2>
        <div className="tactical-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-bullet-muted">
                <th className="px-3 py-2">Zona</th><th className="px-3 py-2">Fator Maior (GBBR)</th><th className="px-3 py-2">Fator Menor (AEG/HPA)</th></tr>
            </thead>
            <tbody>
              {zonas.map(z => (
                <tr key={z[0]} className="border-t border-white/10">
                  <td className="px-3 py-2 uppercase tracking-wider">{z[0]}</td><td className="px-3 py-2 text-bullet-accent">{z[1]}</td><td className="px-3 py-2 text-bullet-accent">{z[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-bullet-accent">Penalizações</h2>
        <div className="tactical-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-bullet-muted">
                <th className="px-3 py-2">Descrição</th><th className="px-3 py-2">Valor</th><th className="px-3 py-2">Aplica a</th></tr>
            </thead>
            <tbody>
              {penalizacoes.map(p => (
                <tr key={p[0]} className="border-t border-white/10">
                  <td className="px-3 py-2">{p[0]}</td><td className="px-3 py-2 font-bold text-red-500">{p[1]}</td><td className="px-3 py-2 text-bullet-muted">{p[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-bullet-muted">
          Arma única: penalização de tempo somada ao tempo do estágio (valor definido pela organização).
        </p>
      </section>
    </div>
  )
}
