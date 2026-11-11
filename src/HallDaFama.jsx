
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const COMPETICAO_ID_PADRAO = '549b62f6-1f54-48db-b002-adb0e4754642'

const estilos = `
  .pl-hall {
    color: #f8fafc;
    width: 100%;
    min-width: 0;
    font-family: Arial, sans-serif;
  }

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

export default function HallDaFama({ competicaoId = COMPETICAO_ID_PADRAO }) {
  const [epocas, setEpocas] = useState([])
  const [epocaId, setEpocaId] = useState('')
  const [classificacao, setClassificacao] = useState([])
  const [aCarregarEpocas, setACarregarEpocas] = useState(true)
  const [aCarregarClassificacao, setACarregarClassificacao] = useState(false)
  const [erroEpocas, setErroEpocas] = useState('')
  const [erroClassificacao, setErroClassificacao] = useState('')

  useEffect(() => {
    let ativo = true

    setACarregarEpocas(true)
    setErroEpocas('')
    setErroClassificacao('')
    setEpocas([])
    setEpocaId('')
    setClassificacao([])

    async function carregarEpocas() {
      const { data, error } = await supabase
  .from('seasons')
  .select('id, name, status')
  .eq('status', 'completed')
  .order('created_at', { ascending: false })

      if (!ativo) return

      if (error) {
        setErroEpocas(error.message)
      } else {
      const ordemEpocas = {
  '1.ª Época': 1,
  '2.ª Época': 2,
  'Mundial 2026': 3
}

const epocasOrdenadas = [...(data || [])].sort(
  (a, b) =>
    (ordemEpocas[a.name] ?? 999) -
    (ordemEpocas[b.name] ?? 999)
)

setEpocas(epocasOrdenadas)
        setEpocaId(epocasOrdenadas[0]?.id || '')
      }

      setACarregarEpocas(false)
    }

    carregarEpocas()

    return () => {
      ativo = false
    }
  }, [competicaoId])

  useEffect(() => {
    if (!epocaId) {
      setClassificacao([])
      setACarregarClassificacao(false)
      return
    }

    let ativo = true

    async function carregarClassificacao() {
      setACarregarClassificacao(true)
      setErroClassificacao('')
      setClassificacao([])

      try {
        const { data, error } = await supabase
          .from('hall_of_fame')
          .select('position, participant_name, total_points')
          .eq('season_id', epocaId)
          .order('position', { ascending: true })

        if (!ativo) return

        if (error) {
          setErroClassificacao(error.message)
        } else {
          setClassificacao(data || [])
        }
      } catch (error) {
        if (ativo) {
          setErroClassificacao(error.message)
        }
      } finally {
        if (ativo) {
          setACarregarClassificacao(false)
        }
      }
    }

    carregarClassificacao()

    return () => {
      ativo = false
    }
  }, [epocaId])


  const aCarregar = aCarregarEpocas || aCarregarClassificacao
  const erro = erroEpocas || erroClassificacao

  const primeiros = [1, 2, 3]
    .map(posicao =>
      classificacao.find(
        participante => Number(participante.position) === posicao
      )
    )
    .filter(Boolean)

  const ordemPodio = [
    primeiros.find(p => Number(p.position) === 2),
    primeiros.find(p => Number(p.position) === 1),
    primeiros.find(p => Number(p.position) === 3)
  ].filter(Boolean)

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
    <div className="pl-hall">
      <style>{estilos}</style>

      <h1 className="pl-hall-titulo">
        🏆 Hall da Fama
      </h1>

      <p className="pl-hall-subtitulo">
        Os campeões, os melhores participantes e
        os resultados históricos da Predict League.
      </p>

      {epocas.length > 0 && (
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
                👑 Pódio da época
              </h2>

              <div className="pl-hall-podio">
                {ordemPodio.map(participante => {
                  const posicao = Number(participante.position)

                  return (
                    <div
                      key={posicao}
                      className={
                        `pl-hall-podio-card ${obterClasse(posicao)}`
                      }
                    >
                      {posicao === 1 && (
                        <div className="pl-hall-campeao-label">
                          ★ Campeão da época ★
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
              📋 Classificação final
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
                      <th>Pontos</th>
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

                          <td className="pl-hall-tabela-pontos">
                            {participante.total_points}
                          </td>
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
