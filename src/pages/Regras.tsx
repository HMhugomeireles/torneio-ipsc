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
      <h1 className="text-2xl font-bold">Regras & pontuação</h1>

      <p className="text-neutral-300">
        4 estágios. Cada estágio é pontuado por <b>Hit Factor</b> = Pontos ÷ Tempo.
        Os pontos do estágio dão 100 ao melhor Hit Factor e proporcional aos restantes.
        A classificação geral é a soma dos pontos dos 4 estágios.
      </p>

      <section>
        <h2 className="mb-2 font-bold">Pontuação por zona</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-400">
            <tr><th>Zona</th><th>Fator Maior (GBBR)</th><th>Fator Menor (AEG/HPA)</th></tr>
          </thead>
          <tbody>
            {zonas.map(z => (
              <tr key={z[0]} className="border-t border-neutral-800">
                <td>{z[0]}</td><td>{z[1]}</td><td>{z[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Penalizações</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-400">
            <tr><th>Descrição</th><th>Valor</th><th>Aplica a</th></tr>
          </thead>
          <tbody>
            {penalizacoes.map(p => (
              <tr key={p[0]} className="border-t border-neutral-800">
                <td>{p[0]}</td><td>{p[1]}</td><td>{p[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-neutral-400">
          Arma única: penalização de tempo somada ao tempo do estágio (valor definido pela organização).
        </p>
      </section>
    </div>
  )
}
