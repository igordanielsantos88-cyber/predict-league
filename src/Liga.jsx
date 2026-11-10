
import { useEffect, useState } from 'react'
import { supabase } from './supabase'


const estilos = `
  .pl-liga {
    color: #f8fafc;
    font-family: Arial, sans-serif;
    width: 100%;
    min-width: 0;
  }

  .pl-liga * {
    box-sizing: border-box;
  }

  .pl-liga-titulo {
    color: #e8c76a;
    font-size: clamp(22px, 4vw, 28px);
    margin: 0 0 8px;
  }

  .pl-liga-subtitulo {
    color: #94a3b8;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 24px;
  }

  .pl-liga-filtros {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 24px;
  }

  .pl-liga-filtro {
    padding: 12px 20px;
    background: #1b2535;
    color: #cbd5e1;
    border: 1px solid #3d3b30;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    transition: border-color .2s;
  }

  .pl-liga-filtro:hover {
    border-color: #d4af37;
  }

  .pl-liga-filtro.ativo {
    background: linear-gradient(135deg, #f0d477, #c69c32);
    border-color: #d4af37;
    color: #211806;
  }

  .pl-liga-filtro:focus-visible,
  .pl-liga-select:focus-visible {
    outline: 2px solid #f0d477;
    outline-offset: 3px;
  }

  .pl-liga-seletor {
    margin-bottom: 24px;
  }

  .pl-liga-label {
    display: block;
    color: #e8c76a;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .pl-liga-select {
    width: 100%;
    max-width: 350px;
    padding: 12px;
    background: #172235;
    color: #f8fafc;
    border: 1px solid #8f722e;
    border-radius: 10px;
    font-size: 15px;
  }

  .pl-liga-resumo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin: 20px 0;
  }

  .pl-liga-contagem {
    color: #94a3b8;
    font-size: 14px;
  }

  .pl-liga-meu-cartao {
    background: linear-gradient(120deg, #1b2535, #302718);
    border: 1px solid #8f722e;
    border-radius: 16px;
    padding: 22px;
    margin-bottom: 25px;
  }

  .pl-liga-meu-titulo {
    color: #e8c76a;
    margin: 0 0 18px;
    font-size: 18px;
  }

  .pl-liga-meus-numeros {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .pl-liga-numero {
    background: #0d1523;
    border: 1px solid #594821;
    border-radius: 12px;
    padding: 15px 10px;
    text-align: center;
  }

  .pl-liga-numero strong {
    display: block;
    color: #f0d477;
    font-size: clamp(20px, 3vw, 27px);
    margin-bottom: 8px;
  }

  .pl-liga-numero span {
    color: #94a3b8;
    font-size: 12px;
  }

  .pl-liga-tabela-container {
    overflow-x: auto;
    border: 1px solid #3d3b30;
    border-radius: 15px;
    background: #111827;
  }

  .pl-liga-tabela {
    width: 100%;
    border-collapse: collapse;
    min-width: 560px;
  }

  .pl-liga-tabela th {
    background: #1b2535;
    color: #e8c76a;
    padding: 17px 13px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .5px;
    text-align: center;
    white-space: nowrap;
  }

  .pl-liga-tabela th:nth-child(2) {
    text-align: left;
  }

  .pl-liga-tabela td {
    padding: 16px 13px;
    border-top: 1px solid #29384d;
    text-align: center;
    font-size: 14px;
  }

  .pl-liga-tabela td:nth-child(2) {
    text-align: left;
    font-weight: bold;
    overflow-wrap: anywhere;
  }

  .pl-liga-tabela tbody tr:hover {
    background: #ffffff09;
  }

  .pl-liga-primeiro {
    background: #d4af3715;
  }

  .pl-liga-segundo {
    background: #cbd5e10c;
  }

  .pl-liga-terceiro {
    background: #cd7f3210;
  }

  .pl-liga-eu {
    outline: 1px solid #d4af37;
    outline-offset: -1px;
    background: #d4af3720;
  }

  .pl-liga-pontos {
    color: #f0d477;
    font-size: 17px;
    font-weight: bold;
  }

  .pl-liga-medalha {
    font-size: 22px;
  }

  .pl-liga-eu-etiqueta {
    display: inline-block;
    margin-left: 8px;
    padding: 3px 7px;
    background: #d4af3720;
    border: 1px solid #d4af3750;
    border-radius: 6px;
    color: #e8c76a;
    font-size: 10px;
    white-space: nowrap;
  }

  .pl-liga-vazio {
    padding: 24px;
    color: #94a3b8;
    text-align: center;
  }

  @media (max-width: 600px) {
    .pl-liga-meu-cartao {
      padding: 15px;
    }

    .pl-liga-meus-numeros {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pl-liga-tabela {
      min-width: 510px;
    }

    .pl-liga-tabela th,
    .pl-liga-tabela td {
      padding: 13px 10px;
    }
  }
`

function calcularPrecisao(jogador) {
  const jogos = Number(jogador.jogos_pontuados) || 0
  const exatos = Number(jogador.resultados_exatos) || 0

  if (jogos <= 0) return '0%'

  return ((exatos / jogos) * 100).toFixed(1) + '%'
}

function Liga({ competicaoId = '549b62f6-1f54-48db-b002-adb0e4754642' }) {
  const [classificacao, setClassificacao] = useState([])
  const [tipoClassificacao, setTipoClassificacao] = useState('geral')
  const [jornadas, setJornadas] = useState([])
  const [jornadaSelecionada, setJornadaSelecionada] = useState('')
  const [classificacaoJornada, setClassificacaoJornada] = useState([])
  const [aCarregarJornada, setACarregarJornada] = useState(false)
  const [erroJornada, setErroJornada] = useState('')
  const [utilizadorAtual, setUtilizadorAtual] = useState(null)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    async function carregarJornadas() {
      const { data: epoca, error: erroEpoca } = await supabase
        .from('seasons')
        .select('id')
        .eq('competition_id', competicaoId)
        .eq('status', 'active')
        .single()

      if (!ativo) return

      if (erroEpoca || !epoca) {
        setErroJornada('Não foi possível encontrar a época ativa.')
        return
      }

      const { data, error } = await supabase
        .from('jornadas')
        .select('id, numero, nome')
        .eq('season_id', epoca.id)
        .order('numero', { ascending: true })

      if (!ativo) return

      if (error) {
        setErroJornada(error.message)
        return
      }

      setJornadas(data || [])

      if (data?.length > 0) {
        setJornadaSelecionada(data[0].id)
      }
    }

    carregarJornadas()

    return () => {
      ativo = false
    }
  }, [competicaoId])

  useEffect(() => {
    let ativo = true

    async function carregarClassificacao() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!ativo) return

        setUtilizadorAtual(user?.id ?? null)

        const { data, error } = await supabase.rpc(
          'obter_classificacao',
          { p_competition_id: competicaoId }
        )

        if (!ativo) return

        if (error) {
          setErro(error.message)
        } else {
          setClassificacao(data || [])
        }
      } catch {
        if (ativo) {
          setErro('Ocorreu um erro ao carregar a classificação.')
        }
      } finally {
        if (ativo) setACarregar(false)
      }
    }

    carregarClassificacao()

    return () => {
      ativo = false
    }
  }, [competicaoId])

  useEffect(() => {
    if (tipoClassificacao !== 'jornada' || !jornadaSelecionada) {
      return
    }

    let ativo = true

    async function carregarClassificacaoJornada() {
      setACarregarJornada(true)
      setErroJornada('')

      try {
        const { data, error } = await supabase.rpc(
          'obter_classificacao_jornada',
          {
            p_competition_id: competicaoId,
            p_jornada_id: jornadaSelecionada,
          }
        )

        if (!ativo) return

        if (error) {
          setErroJornada(error.message)
          setClassificacaoJornada([])
        } else {
          setClassificacaoJornada(data || [])
        }
      } catch {
        if (ativo) {
          setErroJornada(
            'Ocorreu um erro ao carregar a classificação da jornada.'
          )
        }
      } finally {
        if (ativo) setACarregarJornada(false)
      }
    }

    carregarClassificacaoJornada()

    return () => {
      ativo = false
    }
  }, [tipoClassificacao, jornadaSelecionada, competicaoId])

  const classificacaoVisivel =
    tipoClassificacao === 'geral'
      ? classificacao
      : classificacaoJornada

  const minhaPosicaoVisivel = classificacaoVisivel.findIndex(
    jogador => jogador.user_id === utilizadorAtual
  )

  const meusDadosVisiveis =
    minhaPosicaoVisivel >= 0
      ? classificacaoVisivel[minhaPosicaoVisivel]
      : null

  const aCarregarAtual =
    tipoClassificacao === 'geral'
      ? aCarregar
      : aCarregarJornada

  const erroAtual =
    tipoClassificacao === 'geral'
      ? erro
      : erroJornada

  return (
    <div className="pl-liga">
      <style>{estilos}</style>

      <h2 className="pl-liga-titulo">
        🏆 Classificação Predict League
      </h2>

      <p className="pl-liga-subtitulo">
        Acompanha a luta pelo primeiro lugar e consulta
        a classificação geral ou de cada jornada.
      </p>

      <div className="pl-liga-filtros">
        <button
          type="button"
          className={
            `pl-liga-filtro ${tipoClassificacao === 'geral' ? 'ativo' : ''}`
          }
          onClick={() => setTipoClassificacao('geral')}
        >
          🏆 Geral
        </button>

        <button
          type="button"
          className={
            `pl-liga-filtro ${tipoClassificacao === 'jornada' ? 'ativo' : ''}`
          }
          onClick={() => setTipoClassificacao('jornada')}
        >
          📅 Por jornada
        </button>
      </div>

      {tipoClassificacao === 'jornada' && (
        <div className="pl-liga-seletor">
          <label
            htmlFor="selecionar-jornada"
            className="pl-liga-label"
          >
            📅 Escolher jornada
          </label>

          <select
            id="selecionar-jornada"
            className="pl-liga-select"
            value={jornadaSelecionada}
            onChange={e => setJornadaSelecionada(e.target.value)}
          >
            {jornadas.length === 0 && (
              <option value="">
                Sem jornadas disponíveis
              </option>
            )}

            {jornadas.map(jornada => (
              <option key={jornada.id} value={jornada.id}>
                {jornada.nome || `Jornada ${jornada.numero}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {aCarregarAtual && (
        <p style={{ color: '#94a3b8' }}>
          A carregar classificação...
        </p>
      )}

      {erroAtual && (
        <p style={{ color: '#f87171' }}>
          Erro: {erroAtual}
        </p>
      )}

      {!aCarregarAtual &&
        !erroAtual &&
        (tipoClassificacao === 'geral' || jornadaSelecionada) && (
          <>
            <div className="pl-liga-resumo">
              <span className="pl-liga-contagem">
                👥 Jogadores inscritos: {classificacaoVisivel.length}
              </span>
            </div>

            {meusDadosVisiveis && (
              <section className="pl-liga-meu-cartao">
                <h3 className="pl-liga-meu-titulo">
                  👤 A minha classificação
                </h3>

                <div className="pl-liga-meus-numeros">
                  <div className="pl-liga-numero">
                    <strong>{minhaPosicaoVisivel + 1}.º</strong>
                    <span>Posição</span>
                  </div>

                  <div className="pl-liga-numero">
                    <strong>{meusDadosVisiveis.pontos}</strong>
                    <span>Pontos</span>
                  </div>

                  <div className="pl-liga-numero">
                    <strong>{meusDadosVisiveis.resultados_exatos}</strong>
                    <span>Resultados exatos</span>
                  </div>

                  <div className="pl-liga-numero">
                    <strong>{meusDadosVisiveis.jogos_pontuados}</strong>
                    <span>Jogos pontuados</span>
                  </div>
                </div>
              </section>
            )}

            {classificacaoVisivel.length === 0 ? (
              <div className="pl-liga-vazio">
                Ainda não existem jogadores nesta classificação.
              </div>
            ) : (
              <div className="pl-liga-tabela-container">
                <table className="pl-liga-tabela">
                  <thead>
                    <tr>
                      <th>Pos.</th>
                      <th>Jogador</th>
                      <th>Jogos</th>
                      <th>Pontos</th>
                      <th>Exatos</th>
                      <th>Precisão</th>
                    </tr>
                  </thead>

                  <tbody>
                    {classificacaoVisivel.map((jogador, indice) => {
                      const souEu =
                        jogador.user_id === utilizadorAtual

                      const classePosicao =
                        indice === 0
                          ? 'pl-liga-primeiro'
                          : indice === 1
                            ? 'pl-liga-segundo'
                            : indice === 2
                              ? 'pl-liga-terceiro'
                              : ''

                      return (
                        <tr
                          key={jogador.user_id}
                          className={
                            `${classePosicao} ${souEu ? 'pl-liga-eu' : ''}`
                          }
                        >
                          <td>
                            <span className="pl-liga-medalha">
                              {indice === 0
                                ? '🥇'
                                : indice === 1
                                  ? '🥈'
                                  : indice === 2
                                    ? '🥉'
                                    : `${indice + 1}.º`}
                            </span>
                          </td>

                          <td>
                            {jogador.jogador}
                            {souEu && (
                              <span className="pl-liga-eu-etiqueta">
                                TU
                              </span>
                            )}
                          </td>

                          <td>{jogador.jogos_pontuados}</td>

                          <td className="pl-liga-pontos">
                            {jogador.pontos}
                          </td>

                          <td>{jogador.resultados_exatos}</td>

                          <td>{calcularPrecisao(jogador)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
    </div>
  )
}

export default Liga
