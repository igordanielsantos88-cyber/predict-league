
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const estilos = `
  .pl-jornadas {
    color: #f8fafc;
    font-family: Arial, sans-serif;
    width: 100%;
    min-width: 0;
  }

  .pl-jornadas * {
    box-sizing: border-box;
  }

  .pl-jornadas h2 {
    color: #e8c76a;
    font-size: clamp(22px, 4vw, 28px);
    margin: 0 0 10px;
  }

  .pl-jornadas-subtitulo {
    color: #94a3b8;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 25px;
  }

  .pl-jornadas-painel {
    background: linear-gradient(120deg, #1b2535, #302718);
    border: 1px solid #8f722e;
    border-radius: 18px;
    padding: 24px;
    margin-bottom: 28px;
  }

  .pl-jornadas-painel h3 {
    color: #e8c76a;
    margin: 0 0 18px;
  }

  .pl-jornadas-formulario {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .pl-jornadas-input {
    padding: 12px 14px;
    background: #0d1523;
    color: #f8fafc;
    border: 1px solid #594821;
    border-radius: 10px;
    font-size: 14px;
    max-width: 100%;
    min-width: 0;
  }

  .pl-jornadas-input:focus {
    outline: 2px solid #d4af37;
    outline-offset: 1px;
  }

  .pl-jornadas-botao {
    padding: 12px 17px;
    background: linear-gradient(135deg, #f0d477, #c69c32);
    color: #211806;
    border: none;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    transition: transform .2s, box-shadow .2s;
  }

  .pl-jornadas-botao:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px #d4af3730;
  }

  .pl-jornadas-botao:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .pl-jornadas-botao-secundario {
    padding: 11px 15px;
    background: #1b2535;
    color: #e8c76a;
    border: 1px solid #8f722e;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
  }

  .pl-jornadas-botao-secundario:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .pl-jornadas-lista-titulo {
    font-size: 20px;
    color: #f8fafc;
    margin: 0 0 18px;
  }

  .pl-jornadas-cartao {
    background: #111827;
    border: 1px solid #3d3b30;
    border-radius: 18px;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .pl-jornadas-cabecalho {
    background: #1b2535;
    padding: 20px;
    border-bottom: 1px solid #594821;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .pl-jornadas-cabecalho h3 {
    color: #e8c76a;
    margin: 0 0 6px;
    font-size: 18px;
  }

  .pl-jornadas-contagem {
    color: #94a3b8;
    font-size: 12px;
  }

  .pl-jornadas-conteudo {
    padding: 16px;
  }

  .pl-jornadas-jogo {
    background: linear-gradient(145deg, #1b2535, #131c2b);
    border: 1px solid #334155;
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 14px;
  }

  .pl-jornadas-jogo:last-child {
    margin-bottom: 0;
  }

  .pl-jornadas-jogo-topo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 18px;
  }

  .pl-jornadas-data {
    color: #94a3b8;
    font-size: 12px;
  }

  .pl-jornadas-etiqueta {
    padding: 6px 11px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: bold;
  }

  .pl-jornadas-etiqueta.bonus {
    background: #d4af3720;
    border: 1px solid #d4af3760;
    color: #f0d477;
  }

  .pl-jornadas-etiqueta.terminado {
    background: #22c55e15;
    border: 1px solid #22c55e50;
    color: #86efac;
  }

  .pl-jornadas-equipas {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    text-align: center;
    margin-bottom: 20px;
  }

  .pl-jornadas-equipa {
    font-size: clamp(14px, 3vw, 18px);
    font-weight: bold;
    overflow-wrap: anywhere;
  }

  .pl-jornadas-resultado {
    padding: 10px 13px;
    background: #0d1523;
    border: 1px solid #8f722e;
    border-radius: 10px;
    color: #f0d477;
    font-size: 20px;
    font-weight: bold;
    white-space: nowrap;
  }

  .pl-jornadas-acoes {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .pl-jornadas-form-extra {
    margin-top: 18px;
    padding: 20px;
    background: #0d1523;
    border: 1px solid #594821;
    border-radius: 12px;
  }

  .pl-jornadas-form-extra h4 {
    margin: 0 0 16px;
    color: #e8c76a;
  }

  .pl-jornadas-campos {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 12px;
    margin-bottom: 16px;
  }

  .pl-jornadas-campo {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
  }

  .pl-jornadas-campo label {
    color: #cbd5e1;
    font-size: 12px;
    font-weight: bold;
  }

  .pl-jornadas-vazio {
    color: #94a3b8;
    padding: 15px 0;
    font-size: 14px;
  }

  @media (max-width: 600px) {
    .pl-jornadas-painel,
    .pl-jornadas-jogo {
      padding: 16px;
    }

    .pl-jornadas-cabecalho {
      padding: 16px;
    }

    .pl-jornadas-conteudo {
      padding: 10px;
    }

    .pl-jornadas-equipas {
      gap: 7px;
    }

    .pl-jornadas-resultado {
      padding: 8px;
      font-size: 16px;
    }

    .pl-jornadas-form-extra {
      padding: 14px;
    }

    .pl-jornadas-formulario .pl-jornadas-input {
      width: 100%;
    }
  }
`

export default function Jornadas() {
  const [epoca, setEpoca] = useState(null)
  const [jornadas, setJornadas] = useState([])
  const [jogos, setJogos] = useState([])
  const [nome, setNome] = useState('')
  const [selecionada, setSelecionada] = useState(null)
  const [casa, setCasa] = useState('')
  const [fora, setFora] = useState('')
  const [dataJogo, setDataJogo] = useState('')
  const [resultadoId, setResultadoId] = useState(null)
  const [golosCasa, setGolosCasa] = useState('')
  const [golosFora, setGolosFora] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [aCarregar, setACarregar] = useState(true)

  async function atualizarListas(id) {
    const [j, m] = await Promise.all([
      supabase
        .from('jornadas')
        .select('id, numero, nome, season_id')
        .eq('season_id', id)
        .order('numero'),
      supabase
        .from('matches')
        .select(
          'id, jornada_id, season_id, home_team, away_team, kickoff, is_bonus, status, home_score, away_score'
        )
        .eq('season_id', id)
        .order('kickoff'),
    ])

    if (j.error) throw j.error
    if (m.error) throw m.error

    setJornadas(j.data || [])
    setJogos(m.data || [])
  }

  useEffect(() => {
    let ativo = true

    async function iniciar() {
      try {
        const { data, error } = await supabase
          .from('seasons')
          .select('id, name, competition_id, competitions!inner(name)')
          .eq('status', 'active')
          .eq('competitions.name', 'Predict League')

        if (error) throw error
        if (!ativo) return

        if (data?.length !== 1) {
          throw new Error(
            'Deve existir exatamente uma época ativa na Predict League.'
          )
        }

        setEpoca(data[0])
        await atualizarListas(data[0].id)
      } catch (e) {
        if (ativo) setErro(e.message)
      } finally {
        if (ativo) setACarregar(false)
      }
    }

    iniciar()

    return () => {
      ativo = false
    }
  }, [])

  async function executar(acao, mensagem) {
    if (ocupado || !epoca) return

    setOcupado(true)

    try {
      await acao()
      await atualizarListas(epoca.id)

      if (mensagem) alert(mensagem)
    } catch (e) {
      alert('Não foi possível concluir: ' + e.message)
    } finally {
      setOcupado(false)
    }
  }

  async function criarJornada() {
    await executar(async () => {
      const numero = Number(nome.trim().match(/\d+$/)?.[0])

      if (!Number.isInteger(numero) || numero < 1) {
        throw new Error('Escreve um nome como Jornada 1.')
      }

      if (jornadas.some(j => j.numero === numero)) {
        throw new Error(
          'Já existe uma jornada com esse número nesta época.'
        )
      }

      const { error } = await supabase.from('jornadas').insert({
        competition_id: epoca.competition_id,
        season_id: epoca.id,
        numero,
        nome: nome.trim(),
      })

      if (error) throw error

      setNome('')
    }, 'Jornada criada!')
  }

  async function alternarBonus(jornada, jogo) {
    await executar(async () => {
      const outrosBonus = jogos.filter(
        j =>
          j.jornada_id === jornada.id &&
          j.is_bonus &&
          j.id !== jogo.id
      ).length

      if (!jogo.is_bonus && outrosBonus >= 2) {
        throw new Error('Esta jornada já tem dois jogos bónus.')
      }

      const { error } = await supabase
        .from('matches')
        .update({ is_bonus: !jogo.is_bonus })
        .eq('id', jogo.id)
        .eq('season_id', epoca.id)

      if (error) throw error
    })
  }

  async function guardarResultado(jogo) {
    await executar(async () => {
      const a = Number(golosCasa)
      const b = Number(golosFora)

      if (
        golosCasa === '' ||
        golosFora === '' ||
        !Number.isInteger(a) ||
        !Number.isInteger(b) ||
        a < 0 ||
        b < 0
      ) {
        throw new Error(
          'Indica dois resultados inteiros não negativos.'
        )
      }

      if (new Date(jogo.kickoff) > new Date()) {
        throw new Error('O jogo ainda não começou.')
      }

      const { error } = await supabase
        .from('matches')
        .update({
          home_score: a,
          away_score: b,
          status: 'finished',
        })
        .eq('id', jogo.id)
        .eq('season_id', epoca.id)

      if (error) throw error

      setResultadoId(null)
    }, 'Resultado guardado!')
  }

  async function criarJogo(jornada) {
    await executar(async () => {
      if (!casa.trim() || !fora.trim() || !dataJogo) {
        throw new Error('Preenche as equipas e a data.')
      }

      if (casa.trim().toLowerCase() === fora.trim().toLowerCase()) {
        throw new Error('As equipas têm de ser diferentes.')
      }

      const data = new Date(dataJogo)

      if (Number.isNaN(data.getTime()) || data <= new Date()) {
        throw new Error('Escolhe uma data futura.')
      }

      const { error } = await supabase
        .from('matches')
        .insert({
          competition_id: epoca.competition_id,
          season_id: epoca.id,
          jornada_id: jornada.id,
          home_team: casa.trim(),
          away_team: fora.trim(),
          kickoff: data.toISOString(),
          is_bonus: false,
        })

      if (error) throw error

      setCasa('')
      setFora('')
      setDataJogo('')
      setSelecionada(null)
    }, 'Jogo criado!')
  }

  if (aCarregar) {
    return <p style={{ color: '#94a3b8' }}>A carregar jornadas...</p>
  }

  if (erro || !epoca) {
    return (
      <p style={{ color: '#f87171' }}>
        {erro || 'Não existe época ativa.'}
      </p>
    )
  }

  return (
    <div className="pl-jornadas">
      <style>{estilos}</style>

      <h2>📅 Gerir Jornadas — {epoca.name}</h2>

      <p className="pl-jornadas-subtitulo">
        Organiza os jogos da época ativa, escolhe os dois
        jogos bónus de cada jornada e regista os resultados.
      </p>

      <section className="pl-jornadas-painel">
        <h3>➕ Criar nova jornada</h3>

        <div className="pl-jornadas-formulario">
          <input
            className="pl-jornadas-input"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex.: Jornada 1"
            aria-label="Nome da jornada"
          />

          <button
            type="button"
            className="pl-jornadas-botao"
            disabled={ocupado}
            onClick={criarJornada}
          >
            + Criar Jornada
          </button>
        </div>
      </section>

      <h3 className="pl-jornadas-lista-titulo">
        📋 Jornadas criadas ({jornadas.length})
      </h3>

      {jornadas.length === 0 && (
        <p className="pl-jornadas-vazio">
          Ainda não existem jornadas nesta época.
        </p>
      )}

      {jornadas.map(jornada => {
        const jogosJornada = jogos.filter(
          j => j.jornada_id === jornada.id
        )

        const totalBonus = jogosJornada.filter(
          j => j.is_bonus
        ).length

        return (
          <section key={jornada.id} className="pl-jornadas-cartao">
            <div className="pl-jornadas-cabecalho">
              <div>
                <h3>
                  📅 {jornada.nome || `Jornada ${jornada.numero}`}
                </h3>

                <span className="pl-jornadas-contagem">
                  {jogosJornada.length} jogos ·
                  {' '}{totalBonus}/2 jogos bónus
                </span>
              </div>

              <button
                type="button"
                className="pl-jornadas-botao-secundario"
                onClick={() => {
                  setSelecionada(
                    selecionada === jornada.id ? null : jornada.id
                  )
                }}
              >
                {selecionada === jornada.id
                  ? 'Cancelar'
                  : '+ Adicionar jogo'}
              </button>
            </div>

            <div className="pl-jornadas-conteudo">
              {jogosJornada.length === 0 && (
                <p className="pl-jornadas-vazio">
                  Ainda não existem jogos nesta jornada.
                </p>
              )}

              {jogosJornada.map(jogo => (
                <div key={jogo.id} className="pl-jornadas-jogo">
                  <div className="pl-jornadas-jogo-topo">
                    <span className="pl-jornadas-data">
                      📅 {new Date(jogo.kickoff).toLocaleString(
                        'pt-PT',
                        {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }
                      )}
                    </span>

                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}>
                      {jogo.is_bonus && (
                        <span className="pl-jornadas-etiqueta bonus">
                          ⭐ Bónus · 2x pontos
                        </span>
                      )}

                      {jogo.status === 'finished' && (
                        <span className="pl-jornadas-etiqueta terminado">
                          ✓ Terminado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pl-jornadas-equipas">
                    <span className="pl-jornadas-equipa">
                      {jogo.home_team}
                    </span>

                    <span className="pl-jornadas-resultado">
                      {jogo.status === 'finished'
                        ? `${jogo.home_score} – ${jogo.away_score}`
                        : 'VS'}
                    </span>

                    <span className="pl-jornadas-equipa">
                      {jogo.away_team}
                    </span>
                  </div>

                  <div className="pl-jornadas-acoes">
                    <button
                      type="button"
                      className="pl-jornadas-botao-secundario"
                      disabled={ocupado}
                      onClick={() => alternarBonus(jornada, jogo)}
                    >
                      {jogo.is_bonus
                        ? '⭐ Retirar bónus'
                        : '☆ Marcar como bónus'}
                    </button>

                    <button
                      type="button"
                      className="pl-jornadas-botao-secundario"
                      onClick={() => {
                        setResultadoId(
                          resultadoId === jogo.id ? null : jogo.id
                        )
                        setGolosCasa(
                          jogo.home_score == null
                            ? ''
                            : String(jogo.home_score)
                        )
                        setGolosFora(
                          jogo.away_score == null
                            ? ''
                            : String(jogo.away_score)
                        )
                      }}
                    >
                      ⚽ Registar resultado
                    </button>
                  </div>

                  {resultadoId === jogo.id && (
                    <div className="pl-jornadas-form-extra">
                      <h4>🏁 Resultado do jogo</h4>

                      <div className="pl-jornadas-campos">
                        <div className="pl-jornadas-campo">
                          <label htmlFor={`casa-${jogo.id}`}>
                            Golos — {jogo.home_team}
                          </label>

                          <input
                            id={`casa-${jogo.id}`}
                            className="pl-jornadas-input"
                            style={{ width: '90px' }}
                            type="number"
                            min="0"
                            step="1"
                            value={golosCasa}
                            onChange={e => setGolosCasa(e.target.value)}
                          />
                        </div>

                        <div className="pl-jornadas-campo">
                          <label htmlFor={`fora-${jogo.id}`}>
                            Golos — {jogo.away_team}
                          </label>

                          <input
                            id={`fora-${jogo.id}`}
                            className="pl-jornadas-input"
                            style={{ width: '90px' }}
                            type="number"
                            min="0"
                            step="1"
                            value={golosFora}
                            onChange={e => setGolosFora(e.target.value)}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="pl-jornadas-botao"
                        disabled={ocupado}
                        onClick={() => guardarResultado(jogo)}
                      >
                        💾 Guardar resultado
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {selecionada === jornada.id && (
                <div className="pl-jornadas-form-extra">
                  <h4>⚽ Adicionar novo jogo</h4>

                  <div className="pl-jornadas-campos">
                    <div className="pl-jornadas-campo">
                      <label>Equipa da casa</label>

                      <input
                        className="pl-jornadas-input"
                        placeholder="Equipa da casa"
                        value={casa}
                        onChange={e => setCasa(e.target.value)}
                      />
                    </div>

                    <div className="pl-jornadas-campo">
                      <label>Equipa visitante</label>

                      <input
                        className="pl-jornadas-input"
                        placeholder="Equipa visitante"
                        value={fora}
                        onChange={e => setFora(e.target.value)}
                      />
                    </div>

                    <div className="pl-jornadas-campo">
                      <label>Data e hora</label>

                      <input
                        className="pl-jornadas-input"
                        type="datetime-local"
                        value={dataJogo}
                        onChange={e => setDataJogo(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="pl-jornadas-botao"
                    disabled={ocupado}
                    onClick={() => criarJogo(jornada)}
                  >
                    💾 Guardar jogo
                  </button>
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
