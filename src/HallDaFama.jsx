
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Ligação explícita entre as duas competições deste grupo.
const COMPETICOES_DO_GRUPO = [
  '549b62f6-1f54-48db-b002-adb0e4754642',
  '3d0f0048-d5b9-418e-b5f5-57d19782fe92',
]

function calcularRanking(registos, unirAndre) {
  const jogadores = new Map()
  const vistos = new Set()
  for (const registo of registos) {
    const original = registo.participant_name?.trim()
    if (!original) throw new Error('Existe um participante histórico sem nome.')
    const nome = unirAndre && original === 'Gordo' ? 'André' : original
    const chave = `${registo.season_id}:${nome}`
    if (vistos.has(chave)) {
      throw new Error(`Existem registos repetidos de ${nome} na mesma época.`)
    }
    vistos.add(chave)
    for (const campo of ['total_points', 'exact_scores', 'position']) {
      if (registo[campo] == null || !Number.isSafeInteger(Number(registo[campo])) ||
          Number(registo[campo]) < (campo === 'position' ? 1 : 0)) {
        throw new Error(`Dados históricos inválidos para ${nome}.`)
      }
    }
    const jogador = jogadores.get(nome) || {
      participant_name: nome, total_points: 0, exact_scores: 0, titulos: 0, epocas: 0,
    }
    jogador.total_points += Number(registo.total_points)
    jogador.exact_scores += Number(registo.exact_scores)
    jogador.titulos += Number(registo.position) === 1 ? 1 : 0
    jogador.epocas += 1
    jogadores.set(nome, jogador)
  }
  const ranking = [...jogadores.values()].sort((a, b) =>
    b.titulos - a.titulos || b.total_points - a.total_points ||
    b.exact_scores - a.exact_scores || a.participant_name.localeCompare(b.participant_name, 'pt-PT')
  )
  ranking.forEach((jogador, indice) => {
    const anterior = ranking[indice - 1]
    jogador.position = anterior && anterior.titulos === jogador.titulos &&
      anterior.total_points === jogador.total_points && anterior.exact_scores === jogador.exact_scores
      ? anterior.position : indice + 1
  })
  return ranking
}

async function lerPaginas(criarConsulta, signal) {
  const linhas = []
  for (let inicio = 0; ; inicio += 500) {
    const { data, error } = await criarConsulta().range(inicio, inicio + 499).abortSignal(signal)
    if (error) throw error
    if (signal.aborted) throw new Error('Consulta cancelada.')
    linhas.push(...(data || []))
    if (!data || data.length < 500) return linhas
  }
}

const estilos = `
  .pl-hall {
    color: #f8fafc;
    width: 100%;
    min-width: 0;
    font-family: Arial, sans-serif;
  }

  .pl-hall-acoes { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .pl-hall-acoes button { background: #1b2535; color: #f8fafc; border: 1px solid #8f722e; border-radius: 10px; padding: 12px 16px; cursor: pointer; font: inherit; }
  .pl-hall-acoes button[aria-pressed="true"] { background: #e8c76a; color: #111827; font-weight: bold; }
  .pl-hall-acoes button:focus-visible { outline: 2px solid #f0d477; outline-offset: 3px; }
  .pl-hall-acoes button:disabled { opacity: .5; cursor: wait; }
  .pl-hall * {
    box-sizing: border-box;
  }

  .pl-hall-titulo {
    color: #e8c76a;
    font-size: clamp(24px, 4vw, 30px);
    margin: 0 0 10px;
  }

  .pl-hall-subtitulo {
    color: #94a3b8;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 26px;
  }

  .pl-hall-seletor {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 30px;
  }

  .pl-hall-seletor label {
    color: #e8c76a;
    font-size: 14px;
    font-weight: bold;
  }

  .pl-hall-seletor select {
    background: #1b2535;
    color: #f8fafc;
    border: 1px solid #8f722e;
    border-radius: 10px;
    padding: 12px 15px;
    font-size: 14px;
    max-width: 100%;
    min-width: 180px;
    cursor: pointer;
  }

  .pl-hall-seccao {
    margin-bottom: 30px;
  }

  .pl-hall-seccao-titulo {
    font-size: 20px;
    color: #f8fafc;
    margin: 0 0 20px;
  }

  .pl-hall-podio {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    align-items: end;
    margin-bottom: 35px;
  }

  .pl-hall-podio-card {
    background: linear-gradient(145deg, #1b2535, #111827);
    border: 1px solid #594821;
    border-radius: 18px;
    padding: 25px 14px;
    text-align: center;
    min-width: 0;
  }

  .pl-hall-podio-card.primeiro {
    background: linear-gradient(145deg, #3b301a, #151c29);
    border: 2px solid #d4af37;
    padding-top: 35px;
    padding-bottom: 35px;
    box-shadow: 0 0 30px #d4af3718;
  }

  .pl-hall-podio-card.segundo {
    border-color: #94a3b8;
  }

  .pl-hall-podio-card.terceiro {
    border-color: #a7794e;
  }

  .pl-hall-medalha {
    font-size: 43px;
    margin-bottom: 13px;
  }

  .pl-hall-campeao-label {
    color: #f0d477;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 13px;
  }

  .pl-hall-nome {
    color: #f8fafc;
    font-size: clamp(14px, 2vw, 19px);
    font-weight: bold;
    margin: 0 0 15px;
    overflow-wrap: anywhere;
  }

  .pl-hall-pontos {
    color: #f0d477;
    font-size: clamp(22px, 3vw, 30px);
    font-weight: bold;
  }

  .pl-hall-pontos-label {
    color: #94a3b8;
    font-size: 12px;
    margin-top: 6px;
  }

  .pl-hall-posicao {
    display: inline-block;
    margin-top: 17px;
    padding: 6px 12px;
    background: #d4af3715;
    border: 1px solid #d4af3740;
    border-radius: 20px;
    color: #f0d477;
    font-size: 12px;
  }

  .pl-hall-tabela-painel {
    background: linear-gradient(145deg, #1b2535, #111827);
    border: 1px solid #594821;
    border-radius: 18px;
    padding: 23px;
  }

  .pl-hall-tabela-scroll {
    overflow-x: auto;
  }

  .pl-hall-tabela {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 14px;
  }

  .pl-hall-tabela th {
    color: #e8c76a;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .5px;
    padding: 15px 12px;
    border-bottom: 1px solid #594821;
  }

  .pl-hall-tabela td {
    padding: 16px 12px;
    border-bottom: 1px solid #29384d;
    color: #cbd5e1;
  }

  .pl-hall-tabela tbody tr:last-child td {
    border-bottom: none;
  }

  .pl-hall-tabela tbody tr:hover {
    background: #d4af3709;
  }

  .pl-hall-tabela tr.campeao td {
    color: #f0d477;
    font-weight: bold;
  }

  .pl-hall-tabela-pontos {
    color: #f0d477 !important;
    font-weight: bold;
  }

  .pl-hall-vazio {
    background: #111827;
    border: 1px dashed #594821;
    border-radius: 14px;
    padding: 30px;
    color: #94a3b8;
    text-align: center;
    font-size: 14px;
    line-height: 1.6;
  }

  .pl-hall-erro {
    padding: 16px;
    background: #ef444410;
    border: 1px solid #ef444460;
    border-radius: 10px;
    color: #fca5a5;
    margin-bottom: 20px;
  }

  @media (max-width: 650px) {
    .pl-hall-podio {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .pl-hall-podio-card {
      padding: 20px 14px;
    }

    .pl-hall-podio-card.primeiro {
      padding: 28px 14px;
    }

    .pl-hall-medalha {
      font-size: 38px;
    }

    .pl-hall-tabela-painel {
      padding: 15px 10px;
    }

    .pl-hall-tabela th,
    .pl-hall-tabela td {
      padding: 13px 8px;
      font-size: 12px;
    }

    .pl-hall-seletor {
      align-items: stretch;
      flex-direction: column;
    }

    .pl-hall-seletor select {
      width: 100%;
    }
  }
`

export default function HallDaFama({ competicaoId }) {
  const [vista, setVista] = useState('historico')
  const [epocaId, setEpocaId] = useState('')
  const [atualizacao, setAtualizacao] = useState(0)
  const [estado, setEstado] = useState(null)
  // Sem prop, preserva o histórico do grupo já apresentado neste componente.
  // Uma competição diferente nunca recebe o histórico deste grupo.
  const contexto = competicaoId || 'grupo-predict-league'

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    setEstado(null)
    async function carregar() {
      try {
        const grupoConhecido = !competicaoId || COMPETICOES_DO_GRUPO.includes(competicaoId)
        const ids = grupoConhecido ? COMPETICOES_DO_GRUPO : [competicaoId]
        const epocas = await lerPaginas(() => supabase.from('seasons')
          .select('id, name, status, is_test, competition_id, created_at')
          .eq('status', 'completed').eq('is_test', false)
          .in('competition_id', ids).order('created_at').order('id'), signal)
        const ordem = { '1.ª Época': 1, '2.ª Época': 2, 'Mundial 2026': 3 }
        epocas.sort((a, b) => (ordem[a.name] ?? 999) - (ordem[b.name] ?? 999))
        const registos = epocas.length ? await lerPaginas(() => supabase.from('hall_of_fame')
          .select('id, season_id, participant_name, position, total_points, exact_scores')
          .in('season_id', epocas.map(epoca => epoca.id)).order('id'), signal) : []
        const ranking = calcularRanking(registos, grupoConhecido)
        if (signal.aborted) return
        setEpocaId(anterior => epocas.some(epoca => epoca.id === anterior) ? anterior : epocas[0]?.id || '')
        setEstado({ contexto, atualizacao, epocas, registos, ranking, erro: '' })
      } catch (erro) {
        if (!signal.aborted) setEstado({ contexto, atualizacao, epocas: [], registos: [], ranking: [],
          erro: erro.message || 'Não foi possível carregar o histórico.' })
      }
    }
    carregar()
    return () => controller.abort()
  }, [competicaoId, contexto, atualizacao])

  const pronto = estado?.contexto === contexto && estado?.atualizacao === atualizacao
  const aCarregar = !pronto
  const erro = pronto ? estado.erro : ''
  const epocas = pronto ? estado.epocas : []
  const historico = vista === 'historico'
  const classificacao = !pronto || erro ? [] : historico ? estado.ranking :
    estado.registos.filter(registo => registo.season_id === epocaId)
      .sort((a, b) => Number(a.position) - Number(b.position) ||
        a.participant_name.localeCompare(b.participant_name, 'pt-PT'))
  const ordemPodio = [2, 1, 3].flatMap(posicao =>
    classificacao.filter(participante => Number(participante.position) === posicao))

  function obterMedalha(posicao) {
    if (posicao === 1) return '🥇'
    if (posicao === 2) return '🥈'
    if (posicao === 3) return '🥉'
    return '🏅'
  }

  function obterClasse(posicao) {
    if (posicao === 1) return 'primeiro'
    if (posicao === 2) return 'segundo'
    if (posicao === 3) return 'terceiro'
    return ''
  }

  return (
    <div className="pl-hall pl-secao">
      <style>{estilos}</style>

      <h1 className="pl-hall-titulo">
        🏆 Hall da Fama
      </h1>

      <p className="pl-hall-subtitulo">
        Os campeões, os melhores participantes e
        os resultados históricos da Predict League.
      </p>

      <div className="pl-hall-acoes" aria-label="Vista do Hall da Fama">
        <button type="button" aria-pressed={historico} onClick={() => setVista('historico')}>Ranking histórico</button>
        <button type="button" aria-pressed={!historico} onClick={() => setVista('epoca')}>Por época</button>
        <button type="button" disabled={aCarregar} onClick={() => setAtualizacao(valor => valor + 1)}>Atualizar</button>
      </div>
      {historico && <p className="pl-hall-subtitulo">
        Apenas épocas oficiais concluídas. Ordem: títulos, pontos e resultados exatos.
        Empates nos três critérios partilham a posição. Épocas indica os registos históricos de cada participante.
      </p>}
      {!historico && epocas.length > 0 && (
        <div className="pl-hall-seletor">
          <label htmlFor="pl-hall-epoca">
            📅 Escolher época
          </label>

          <select
            id="pl-hall-epoca"
            value={epocaId}
            onChange={e => setEpocaId(e.target.value)}
          >
            {epocas.map(epoca => (
              <option key={epoca.id} value={epoca.id}>
                {epoca.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {aCarregar && (
        <p style={{ color: '#94a3b8' }}>
          A carregar Hall da Fama...
        </p>
      )}

      {erro && (
        <div className="pl-hall-erro">
          Erro: {erro}
        </div>
      )}

      {!aCarregar && !erro && epocas.length === 0 && (
        <div className="pl-hall-vazio">
          🏆 Ainda não existem épocas concluídas.
          Os campeões aparecerão aqui quando
          uma época terminar.
        </div>
      )}

      {!aCarregar && !erro && epocas.length > 0 && (
        <>
          {ordemPodio.length > 0 && (
            <section className="pl-hall-seccao">
              <h2 className="pl-hall-seccao-titulo">
                {historico ? '👑 Pódio histórico' : '👑 Pódio da época'}
              </h2>

              <div className="pl-hall-podio">
                {ordemPodio.map(participante => {
                  const posicao = Number(participante.position)

                  return (
                    <div
                      key={participante.id || participante.participant_name}
                      className={
                        `pl-hall-podio-card ${obterClasse(posicao)}`
                      }
                    >
                      {posicao === 1 && (
                        <div className="pl-hall-campeao-label">
                          {historico ? '★ Líder histórico ★' : '★ Campeão da época ★'}
                        </div>
                      )}

                      <div className="pl-hall-medalha">
                        {obterMedalha(posicao)}
                      </div>

                      <h3 className="pl-hall-nome">
                        {participante.participant_name || 'Sem nome'}
                      </h3>

                      <div className="pl-hall-pontos">
                        {participante.total_points}
                      </div>

                      <div className="pl-hall-pontos-label">
                        pontos
                      </div>

                      <div className="pl-hall-posicao">
                        {posicao}.º lugar
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section className="pl-hall-tabela-painel">
            <h2 className="pl-hall-seccao-titulo">
              {historico ? '📋 Ranking histórico' : '📋 Classificação final'}
            </h2>

            {classificacao.length === 0 ? (
              <div className="pl-hall-vazio">
                Ainda não existem resultados
                registados nesta época.
              </div>
            ) : (
              <div className="pl-hall-tabela-scroll">
                <table className="pl-hall-tabela">
                  <thead>
                    <tr>
                      <th>Pos.</th>
                      <th>Participante</th>
                      {historico && <th>Títulos</th>}
                      <th>Pontos</th>
                      <th>Exatos</th>
                      {historico && <th>Épocas</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {classificacao.map((participante, indice) => {
                      const posicao = Number(participante.position)

                      return (
                        <tr
                          key={`${posicao}-${indice}`}
                          className={
                            posicao === 1 ? 'campeao' : ''
                          }
                        >
                          <td>
                            {posicao <= 3
                              ? obterMedalha(posicao)
                              : `${posicao}.º`}
                          </td>

                          <td>
                            {participante.participant_name || 'Sem nome'}
                          </td>

                          {historico && <td>{participante.titulos}</td>}
                          <td className="pl-hall-tabela-pontos">
                            {participante.total_points}
                          </td>
                          <td>{participante.exact_scores}</td>
                          {historico && <td>{participante.epocas}</td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
