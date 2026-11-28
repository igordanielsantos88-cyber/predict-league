import { useEffect, useRef, useState } from 'react'
import { descreverMovimento } from './movimentoClassificacao'

const taxa = new Intl.NumberFormat('pt-PT', { style: 'percent', maximumFractionDigits: 1 })
const pontos = valor => `${valor} ${valor === 1 ? 'ponto' : 'pontos'}`
const nomeJornada = linha => linha.jornada || `Jornada ${linha.numero}`
const resultadoPrevisto = (jogo, escolha) => escolha === 0 ? 'empate' : `vitória de ${escolha > 0 ? jogo.casa : jogo.fora}`

function ContraCorrente({ dados }) {
  const [todos, setTodos] = useState(false)
  return (
    <section className="pl-estatisticas-analise" aria-labelledby="pl-contra-corrente">
      <h3 id="pl-contra-corrente">Contra a corrente</h3>
      {dados.total === 0 ? <p>Ainda não tens jogos pontuados em que tenhas ido contra a maioria.</p> : (
        <>
          <p><strong>{dados.total} {dados.total === 1 ? 'jogo' : 'jogos'} · {pontos(dados.pontos)}</strong>
            {' · '}{dados.acertos} {dados.acertos === 1 ? 'acerto' : 'acertos'}</p>
          <ul className="pl-destaques-lista">
            {(todos ? dados.jogos : dados.jogos.slice(0, 5)).map(jogo => (
              <li key={jogo.id}>
                <strong>{jogo.casa} {jogo.golosCasa}–{jogo.golosFora} {jogo.fora}</strong>
                {' · '}{pontos(jogo.pontos)}
                <div>Escolheste {resultadoPrevisto(jogo, jogo.escolha)}. {jogo.votos} de {jogo.total} outros
                  {' '}({taxa.format(jogo.votos / jogo.total)}) escolheram {resultadoPrevisto(jogo, jogo.maioria)}.</div>
              </li>
            ))}
          </ul>
          {dados.jogos.length > 5 && <div className="pl-estatisticas-controlos">
            <button type="button" onClick={() => setTodos(valor => !valor)}>{todos ? 'Mostrar menos' : 'Ver todos os jogos'}</button>
          </div>}
        </>
      )}
      <p className="pl-estatisticas-nota">A maioria tem mais de metade dos votos dos outros participantes no jogo.</p>
    </section>
  )
}

export function EvolucaoClassificacao({ jornadas, visivel }) {
  const [jornadaId, setJornadaId] = useState(null)
  const grafico = useRef(null)
  const mostrouGrafico = useRef(false)
  const selecionada = jornadas.find(item => item.id === jornadaId) || jornadas.at(-1)

  useEffect(() => {
    const elemento = grafico.current
    if (visivel && elemento && !mostrouGrafico.current) {
      elemento.scrollLeft = elemento.scrollWidth
      mostrouGrafico.current = true
    }
  }, [visivel])

  const piorPosicao = Math.max(1, ...jornadas.map(item => item.posicao))
  const largura = Math.max(240, jornadas.length * 56)
  const intervalo = (largura - 56) / Math.max(1, jornadas.length - 1)
  const pontosGrafico = jornadas.map((item, indice) => ({
    ...item,
    x: jornadas.length === 1 ? largura / 2 : 28 + intervalo * indice,
    y: piorPosicao === 1 ? 68 : 27 + 105 * (item.posicao - 1) / (piorPosicao - 1),
  }))

  return (
    <section className="pl-estatisticas-analise" aria-labelledby="pl-evolucao-classificacao">
      <h3 id="pl-evolucao-classificacao">Evolução na classificação</h3>
      {!selecionada ? <p>Ainda não há jornadas consecutivas concluídas desde a Jornada 1.</p> : (
        <>
          <div className="pl-destaques-grafico" ref={grafico} role="group" aria-label="Posição por jornada">
            <div className="pl-destaques-curva" style={{ width: largura }}>
              <svg width={largura} height="190" aria-hidden="true">
                <polyline fill="none" stroke="#d4af37" strokeWidth="3"
                  points={pontosGrafico.map(({ x, y }) => `${x},${y}`).join(' ')} />
              </svg>
              {pontosGrafico.map(item => (
                <button key={item.id} type="button" className="pl-destaques-ponto"
                  style={{ left: item.x, top: item.y }}
                  aria-label={`${nomeJornada(item)}, ${item.posicao}.º lugar`}
                  aria-pressed={item.id === selecionada.id} aria-controls="pl-evolucao-detalhe"
                  onClick={() => setJornadaId(item.id)}>
                  {item.posicao}.º
                </button>
              ))}
              {pontosGrafico.map(item => (
                <span className="pl-destaques-jornada" key={item.id} style={{ left: item.x }} aria-hidden="true">J{item.numero}</span>
              ))}
            </div>
          </div>
          <div id="pl-evolucao-detalhe" aria-live="polite">
            <strong>{nomeJornada(selecionada)} · {selecionada.posicao}.º lugar</strong>
            <p>{pontos(selecionada.pontos)} na jornada · {pontos(selecionada.total)} no acumulado</p>
            <p>{selecionada.anterior == null ? 'Primeira jornada da classificação.' :
              descreverMovimento(selecionada.anterior, selecionada.posicao)}</p>
            {selecionada.ultrapassados.length > 0 && <p>Ultrapassaste {selecionada.ultrapassados.join(', ')}.</p>}
          </div>
        </>
      )}
      <p className="pl-estatisticas-nota">A evolução acumula jornadas concluídas desde a Jornada 1.</p>
    </section>
  )
}

const tiposDeRecorde = [
  ['subida', 'Maior subida numa jornada', ['posição', 'posições']],
  ['sequencia', 'Maior sequência a pontuar', ['jogo', 'jogos']],
  ['exatos', 'Mais resultados exatos numa jornada', ['resultado exato', 'resultados exatos']],
]

function RecordesEpoca({ recordes }) {
  return (
    <section className="pl-estatisticas-analise" aria-labelledby="pl-recordes-epoca">
      <h3 id="pl-recordes-epoca">Recordes da época</h3>
      <ul className="pl-destaques-lista">
        {tiposDeRecorde.map(([tipo, titulo, [singular, plural]]) => {
          const lideres = recordes.filter(item => item.tipo === tipo)
          const valor = lideres[0]?.valor
          return (
            <li key={tipo}>
              <div>{titulo}</div>
              {valor ? (
                <>
                  <div className="pl-destaques-valor"><strong>{valor} {valor === 1 ? singular : plural}</strong></div>
                  <div>{lideres.map(item => item.numero == null ? item.nome : `${item.nome} (${nomeJornada(item)})`).join(' · ')}</div>
                </>
              ) : <div className="pl-estatisticas-nota">Ainda sem recorde.</div>}
            </li>
          )
        })}
      </ul>
      <p className="pl-estatisticas-nota">A sequência segue a hora dos jogos com resultado publicado. Um jogo sem pontos interrompe-a.</p>
    </section>
  )
}

export default function DestaquesEpoca({ dados }) {
  return (
    <>
      <ContraCorrente dados={dados.contraCorrente} />
      <RecordesEpoca recordes={dados.recordes} />
    </>
  )
}
