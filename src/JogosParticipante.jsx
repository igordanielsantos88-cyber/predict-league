
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const COMPETICAO_ID = '3d0f0048-d5b9-418e-b5f5-57d19782fe92'

const estilos = `
  .pl-jogos {
    color: #f8fafc;
    font-family: Arial, sans-serif;
  }

  .pl-jogos * {
    box-sizing: border-box;
  }

  .pl-jogos-titulo {
    color: #e8c76a;
    font-size: 24px;
    margin: 0 0 8px;
  }

  .pl-jogos-subtitulo {
    color: #94a3b8;
    font-size: 14px;
    margin-bottom: 24px;
  }

  .pl-jogos-filtros {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .pl-jogos-filtro {
    padding: 11px 17px;
    border-radius: 10px;
    border: 1px solid #3d3b30;
    background: #1b2535;
    color: #cbd5e1;
    cursor: pointer;
    font-weight: bold;
    transition: .2s;
  }

  .pl-jogos-filtro:hover {
    border-color: #d4af37;
  }

  .pl-jogos-filtro.ativo {
    background: linear-gradient(135deg, #f0d477, #c69c32);
    color: #211806;
    border-color: #d4af37;
  }

  .pl-jornada {
    margin-bottom: 22px;
    border: 1px solid #3d3b30;
    border-radius: 15px;
    overflow: hidden;
    background: #111827;
  }

  .pl-jornada-summary {
    padding: 18px 20px;
    color: #e8c76a;
    background: #1b2535;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    list-style-position: inside;
  }

  .pl-jornada-conteudo {
    padding: 16px;
  }

  .pl-jogo-cartao {
    background: linear-gradient(145deg, #1b2535, #131c2b);
    border: 1px solid #334155;
    border-radius: 15px;
    padding: 22px;
    margin-bottom: 14px;
  }

  .pl-jogo-cartao:last-child {
    margin-bottom: 0;
  }

  .pl-jogo-topo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 18px;
  }

  .pl-jogo-data {
    color: #94a3b8;
    font-size: 13px;
  }

  .pl-jogo-bonus {
    display: inline-block;
    background: #d4af371a;
    border: 1px solid #d4af3760;
    color: #f0d477;
    border-radius: 20px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: bold;
  }

  .pl-jogo-equipas {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 14px;
    margin: 20px 0;
    text-align: center;
  }

  .pl-jogo-equipa {
    font-size: clamp(14px, 3vw, 19px);
    font-weight: bold;
    overflow-wrap: anywhere;
  }

  .pl-jogo-versus {
    color: #d4af37;
    font-size: 13px;
    font-weight: bold;
    padding: 9px;
    border: 1px solid #8f722e;
    border-radius: 8px;
  }

  .pl-jogo-divisor {
    height: 1px;
    background: #334155;
    margin: 20px 0;
  }

  .pl-jogo-inputs {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin: 18px 0;
  }

  .pl-jogo-input {
    width: 75px;
    padding: 12px;
    background: #0d1523;
    color: #f8fafc;
    border: 1px solid #8f722e;
    border-radius: 10px;
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    outline: none;
  }

  .pl-jogo-input:focus {
    border-color: #f0d477;
    box-shadow: 0 0 0 3px #d4af3720;
  }

  .pl-jogo-botao {
    display: inline-block;
    padding: 12px 18px;
    background: linear-gradient(135deg, #f0d477, #c69c32);
    color: #211806;
    border: none;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
  }

  .pl-jogo-botao:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .pl-jogo-secundario {
    background: #1b2535;
    border: 1px solid #8f722e;
    color: #e8c76a;
    padding: 11px 16px;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
  }

  .pl-jogo-resultado {
    background: #0d1523;
    border: 1px solid #594821;
    border-radius: 12px;
    padding: 17px;
    margin: 18px 0;
  }

  .pl-jogo-pontos {
    color: #e8c76a;
    font-weight: bold;
    font-size: 17px;
  }

  .pl-jogo-outros {
    margin-top: 15px;
    padding: 16px;
    background: #0d1523;
    border: 1px solid #594821;
    border-radius: 12px;
  }

  .pl-jogo-outro {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid #29384d;
  }

  .pl-jogo-outro:last-child {
    border-bottom: none;
  }

  @media (max-width: 600px) {
    .pl-jogo-cartao {
      padding: 15px;
    }

    .pl-jornada-conteudo {
      padding: 10px;
    }

    .pl-jogo-equipas {
      gap: 8px;
    }

    .pl-jogo-input {
      width: 65px;
    }
  }
`

function JogosParticipante() {
  const [jogos, setJogos] = useState([])
  const [jornadas, setJornadas] = useState([])
  const [palpites, setPalpites] = useState({})
  const [historico, setHistorico] = useState([])
  const [filtroJogos, setFiltroJogos] = useState('todos')
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')
  const [aGuardar, setAGuardar] = useState(null)
  const [prognosticosOutros, setPrognosticosOutros] = useState({})
  const [jogoAberto, setJogoAberto] = useState(null)
  const [aCarregarPrognosticos, setACarregarPrognosticos] = useState(null)

  useEffect(() => {
    let ativo = true

    async function atualizarPontos() {
      const { data, error } = await supabase.rpc('obter_meus_pontos')

      if (ativo && !error) {
        setHistorico(data || [])
      }
    }

    const intervalo = setInterval(atualizarPontos, 30000)

    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [])

  useEffect(() => {
    let ativo = true

    async function carregarJogos() {
      try {
        const { data: epoca, error: erroEpoca } = await supabase
          .from('seasons')
          .select('id')
          .eq('competition_id', COMPETICAO_ID)
          .eq('status', 'active')
          .single()

        if (!ativo) return

        if (erroEpoca || !epoca) {
          setErro('Não foi possível encontrar a época ativa.')
          return
        }

        const { data: dadosJornadas, error: erroJornadas } =
          await supabase
            .from('jornadas')
            .select('id, numero, nome')
            .eq('season_id', epoca.id)
            .order('numero', { ascending: true })

        if (!ativo) return

        if (erroJornadas) {
          setErro('Erro ao carregar jornadas: ' + erroJornadas.message)
          return
        }

        setJornadas(dadosJornadas || [])

        const { data, error } = await supabase
          .from('matches')
          .select('id, home_team, away_team, kickoff, is_bonus, jornada_id, status')
          .eq('competition_id', COMPETICAO_ID)
          .eq('season_id', epoca.id)
          .order('kickoff', { ascending: true })

        if (!ativo) return

        if (error) {
          setErro('Erro ao carregar jogos: ' + error.message)
          return
        }

        setJogos(data || [])

        const { data: { user }, error: erroUtilizador } =
          await supabase.auth.getUser()

        if (!ativo) return

        if (erroUtilizador || !user) {
          setErro('Não foi possível identificar o participante.')
          return
        }

        const { data: prognosticos, error: erroPrognosticos } =
          await supabase
            .from('predictions')
            .select('match_id, home_goals, away_goals')
            .eq('user_id', user.id)

        if (!ativo) return

        if (erroPrognosticos) {
          setErro(
            'Erro ao carregar prognósticos: ' +
            erroPrognosticos.message
          )
          return
        }

        const palpitesGuardados = {}

        for (const prognostico of prognosticos || []) {
          palpitesGuardados[prognostico.match_id] = {
            casa: String(prognostico.home_goals),
            fora: String(prognostico.away_goals),
          }
        }

        setPalpites(palpitesGuardados)

        if ((data || []).length > 0) {
          const { data: pontuacoes, error: erroPontuacoes } =
            await supabase.rpc('obter_meus_pontos')

          if (!ativo) return

          if (erroPontuacoes) {
            setErro(
              'Erro ao carregar histórico: ' +
              erroPontuacoes.message
            )
          } else {
            setHistorico(pontuacoes || [])
          }
        } else {
          setHistorico([])
        }
      } catch {
        if (ativo) {
          setErro('Ocorreu um erro ao carregar os jogos.')
        }
      } finally {
        if (ativo) setACarregar(false)
      }
    }

    carregarJogos()

    return () => {
      ativo = false
    }
  }, [])

  async function guardarPalpite(jogo) {
    const palpite = palpites[jogo.id]

    if (
      palpite?.casa === undefined ||
      palpite?.fora === undefined ||
      palpite.casa === '' ||
      palpite.fora === ''
    ) {
      alert('Preenche os golos das duas equipas.')
      return
    }

    const casa = Number(palpite.casa)
    const fora = Number(palpite.fora)

    if (
      !Number.isInteger(casa) ||
      !Number.isInteger(fora) ||
      casa < 0 ||
      fora < 0
    ) {
      alert('Introduz números inteiros iguais ou superiores a zero.')
      return
    }

    if (new Date(jogo.kickoff).getTime() <= Date.now()) {
      alert('O prazo para este jogo já terminou.')
      return
    }

    setAGuardar(jogo.id)

    try {
      const { data: { user }, error: erroUtilizador } =
        await supabase.auth.getUser()

      if (erroUtilizador || !user) {
        alert('Tens de iniciar sessão para guardar o prognóstico.')
        return
      }

      const { error } = await supabase
        .from('predictions')
        .upsert(
          {
            match_id: jogo.id,
            user_id: user.id,
            home_goals: casa,
            away_goals: fora,
          },
          { onConflict: 'match_id,user_id' }
        )

      if (error) {
        alert('Não foi possível guardar: ' + error.message)
      } else {
        alert('Prognóstico guardado com sucesso! ⚽')
      }
    } catch {
      alert('Ocorreu um erro ao guardar o prognóstico.')
    } finally {
      setAGuardar(null)
    }
  }

  async function verPrognosticos(jogo) {
    if (jogoAberto === jogo.id) {
      setJogoAberto(null)
      return
    }

    if (new Date(jogo.kickoff).getTime() > Date.now()) {
      alert('Os prognósticos só ficam visíveis após o início do jogo.')
      return
    }

    setJogoAberto(jogo.id)
    setACarregarPrognosticos(jogo.id)

    try {
      const { data, error } = await supabase.rpc(
        'ver_prognosticos_jogo',
        { p_match_id: jogo.id }
      )

      if (error) {
        alert('Erro ao carregar prognósticos: ' + error.message)
        setJogoAberto(null)
      } else {
        setPrognosticosOutros(anteriores => ({
          ...anteriores,
          [jogo.id]: data || [],
        }))
      }
    } catch {
      alert('Ocorreu um erro ao carregar os prognósticos.')
      setJogoAberto(null)
    } finally {
      setACarregarPrognosticos(null)
    }
  }

  const jogosFiltrados = jogos.filter(jogo => {
    const comecou =
      new Date(jogo.kickoff).getTime() <= Date.now()

    if (filtroJogos === 'por-jogar') {
      return !comecou
    }

    if (filtroJogos === 'terminados') {
      return jogo.status === 'finished'
    }

    return true
  })

  const jogosPorJornada = jornadas
    .map(jornada => ({
      ...jornada,
      jogos: jogosFiltrados.filter(
        jogo => jogo.jornada_id === jornada.id
      ),
    }))
    .filter(jornada => jornada.jogos.length > 0)

  if (aCarregar) {
    return <p>A carregar os jogos...</p>
  }

  if (erro) {
    return <p style={{ color: '#f87171' }}>{erro}</p>
  }

  return (
    <div className="pl-jogos">
      <style>{estilos}</style>

      <h2 className="pl-jogos-titulo">
        ⚽ Jogos da Predict League
      </h2>

      <p className="pl-jogos-subtitulo">
        Faz os teus prognósticos e acompanha os pontos conquistados.
      </p>

      <div className="pl-jogos-filtros">
        {[
          ['todos', '⚽ Todos'],
          ['por-jogar', '📅 Por jogar'],
          ['terminados', '🏁 Terminados'],
        ].map(([valor, nome]) => (
          <button
            key={valor}
            type="button"
            className={
              `pl-jogos-filtro ${filtroJogos === valor ? 'ativo' : ''}`
            }
            onClick={() => setFiltroJogos(valor)}
          >
            {nome}
          </button>
        ))}
      </div>

      {jogosPorJornada.length === 0 ? (
        <p>Não existem jogos para o filtro selecionado.</p>
      ) : (
        jogosPorJornada.map(jornada => (
          <details key={jornada.id} open className="pl-jornada">
            <summary className="pl-jornada-summary">
              📅 {jornada.nome || `Jornada ${jornada.numero}`}
              {' '}— {jornada.jogos.length}
              {jornada.jogos.length === 1 ? ' jogo' : ' jogos'}
            </summary>

            <div className="pl-jornada-conteudo">
              {jornada.jogos.map(jogo => {
                const comecou =
                  new Date(jogo.kickoff).getTime() <= Date.now()

                const resultado = historico.find(
                  item => item.match_id === jogo.id
                )

                return (
                  <div key={jogo.id} className="pl-jogo-cartao">
                    <div className="pl-jogo-topo">
                      <span className="pl-jogo-data">
                        📅 {new Date(jogo.kickoff).toLocaleString('pt-PT')}
                      </span>

                      {jogo.is_bonus && (
                        <span className="pl-jogo-bonus">
                          ⭐ Jogo Bónus · Pontos a dobrar
                        </span>
                      )}
                    </div>

                    <div className="pl-jogo-equipas">
                      <span className="pl-jogo-equipa">
                        {jogo.home_team}
                      </span>

                      <span className="pl-jogo-versus">
                        VS
                      </span>

                      <span className="pl-jogo-equipa">
                        {jogo.away_team}
                      </span>
                    </div>

                    {resultado && resultado.points !== null && (
                      <div className="pl-jogo-resultado">
                        <p>
                          🎯 O teu prognóstico:
                          {' '}{palpites[jogo.id]?.casa}–
                          {palpites[jogo.id]?.fora}
                        </p>

                        <p>
                          🏁 Resultado oficial:
                          {' '}{resultado.home_score}–
                          {resultado.away_score}
                        </p>

                        <p className="pl-jogo-pontos">
                          🏆 Pontos conquistados: +{resultado.points}
                        </p>

                        {resultado.exact_score ? (
                          <p style={{ color: '#22c55e' }}>
                            🎯 Acertaste no resultado exato!
                          </p>
                        ) : resultado.points > 0 ? (
                          <p style={{ color: '#f0d477' }}>
                            ✅ Acertaste na tendência!
                          </p>
                        ) : (
                          <p style={{ color: '#f87171' }}>
                            ❌ Não acertaste no prognóstico.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="pl-jogo-divisor" />

                    {!comecou ? (
                      <div>
                        <p style={{
                          textAlign: 'center',
                          color: '#cbd5e1',
                        }}>
                          🎯 O teu prognóstico
                        </p>

                        <div className="pl-jogo-inputs">
                          <input
                            className="pl-jogo-input"
                            type="number"
                            min="0"
                            step="1"
                            aria-label={`Golos de ${jogo.home_team}`}
                            placeholder="Casa"
                            value={palpites[jogo.id]?.casa ?? ''}
                            onChange={e => setPalpites(anteriores => ({
                              ...anteriores,
                              [jogo.id]: {
                                ...anteriores[jogo.id],
                                casa: e.target.value,
                              },
                            }))}
                          />

                          <span style={{
                            color: '#d4af37',
                            fontSize: '22px',
                          }}>
                            –
                          </span>

                          <input
                            className="pl-jogo-input"
                            type="number"
                            min="0"
                            step="1"
                            aria-label={`Golos de ${jogo.away_team}`}
                            placeholder="Fora"
                            value={palpites[jogo.id]?.fora ?? ''}
                            onChange={e => setPalpites(anteriores => ({
                              ...anteriores,
                              [jogo.id]: {
                                ...anteriores[jogo.id],
                                fora: e.target.value,
                              },
                            }))}
                          />
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="pl-jogo-botao"
                            onClick={() => guardarPalpite(jogo)}
                            disabled={aGuardar === jogo.id}
                          >
                            {aGuardar === jogo.id
                              ? 'A guardar...'
                              : '💾 Guardar prognóstico'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{
                          color: '#94a3b8',
                          fontSize: '13px',
                        }}>
                          🔒 Prognósticos encerrados — o jogo já começou.
                        </p>

                        <button
                          type="button"
                          className="pl-jogo-secundario"
                          onClick={() => verPrognosticos(jogo)}
                          disabled={aCarregarPrognosticos === jogo.id}
                        >
                          {aCarregarPrognosticos === jogo.id
                            ? 'A carregar...'
                            : jogoAberto === jogo.id
                              ? '✖ Fechar prognósticos'
                              : '👥 Ver prognósticos'}
                        </button>

                        {jogoAberto === jogo.id &&
                          aCarregarPrognosticos !== jogo.id && (
                            <div className="pl-jogo-outros">
                              {(prognosticosOutros[jogo.id] || []).length === 0 ? (
                                <p>
                                  Não existem prognósticos para este jogo.
                                </p>
                              ) : (
                                prognosticosOutros[jogo.id].map((p, indice) => (
                                  <div
                                    key={indice}
                                    className="pl-jogo-outro"
                                  >
                                    <span>{p.jogador}</span>

                                    <strong>
                                      {p.golos_casa}–{p.golos_fora}
                                      {p.pontos !== null &&
                                        ` · ${p.pontos} pts`}
                                    </strong>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </details>
        ))
      )}
    </div>
  )
}

export default JogosParticipante
