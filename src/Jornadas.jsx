
import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import HistoricoResultado from './HistoricoResultado'
import ImpactoResultado from './ImpactoResultado'
import CalendarioLigaPortugal from './CalendarioLigaPortugal'
import ImportarJogosOficiais from './ImportarJogosOficiais'
import EmblemaEquipa from './EmblemaEquipa'
import CorrigirEmblema from './CorrigirEmblema'
import MarcadoresPorRever from './MarcadoresPorRever'

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
    display: grid;
    justify-items: center;
    gap: 5px;
    --pl-emblema-tamanho: 32px;
    --pl-emblema-letra: 11px;
    font-size: clamp(14px, 3vw, 18px);
    font-weight: bold;
    overflow-wrap: anywhere;
  }

  .pl-emblema-corrigir { cursor: pointer; border-style: dashed; border-color: #e8c76a; color: inherit; }
  .pl-jornadas-marcador-revisao {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 8px;
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

  .pl-jornadas-filtros { margin-bottom: 16px; }
  .pl-jornadas-filtros button[aria-pressed=true] {
    background: #e8c76a;
    color: #211806;
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
function notaMarcadorOficial(houveDesempate) {
  return houveDesempate
    ? 'Marcador dos 90 minutos, incluindo descontos. Houve prolongamento ou penáltis.'
    : 'Marcador final recebido da Football-Data.org. Revê antes de publicar.'
}

export default function Jornadas({ competicaoId }) {
  const [epoca, setEpoca] = useState(null)
  const [jornadas, setJornadas] = useState([])
  const [jogos, setJogos] = useState([])
  const [emblema, setEmblema] = useState(null)
  const [notaEmblema, setNotaEmblema] = useState('')
  const [nome, setNome] = useState('')
  const [selecionada, setSelecionada] = useState(null)
  const [casa, setCasa] = useState('')
  const [fora, setFora] = useState('')
  const [dataJogo, setDataJogo] = useState('')
  const [resultadoId, setResultadoId] = useState(null)
  const [resultadoEmRevisao, setResultadoEmRevisao] = useState(null)
  const [erroResultado, setErroResultado] = useState('')
  const [notaResultado, setNotaResultado] = useState('')
  const [aConsultarResultado, setAConsultarResultado] = useState(false)
  const [golosCasa, setGolosCasa] = useState('')
  const [golosFora, setGolosFora] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [aCarregar, setACarregar] = useState(true)
  const [soPorFechar, setSoPorFechar] = useState(false)
  const [agora, setAgora] = useState(Date.now)
  const focoResultado = useRef(null)

  useEffect(() => {
    if (resultadoId) focoResultado.current?.focus()
  }, [resultadoId, resultadoEmRevisao])

  useEffect(() => {
    const atualizarHora = () => setAgora(Date.now())
    const intervalo = setInterval(atualizarHora, 30000)
    window.addEventListener('focus', atualizarHora)
    return () => {
      clearInterval(intervalo)
      window.removeEventListener('focus', atualizarHora)
    }
  }, [])

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
          'id, jornada_id, season_id, home_team, away_team, home_crest, away_crest, kickoff, is_bonus, status, home_score, away_score, football_data_match_id, football_data_competition'
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
  .select('id, name, competition_id')
  .eq('competition_id', competicaoId)
  .eq('status', 'active')

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
  }, [competicaoId])

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

  async function atualizarEmblemas(nome, jogoId, lado) {
    await atualizarListas(epoca.id)
    setEmblema(atual => atual?.jogoId === jogoId && atual.lado === lado ? null : atual)
    setNotaEmblema(`Correspondência guardada para ${nome}.`)
  }

  function escolherEmblema(jogo, lado) {
    if (ocupado) return
    setNotaEmblema('')
    setEmblema({ jogoId: jogo.id, lado })
  }

  function reverMarcadorOficial(jogo, marcador) {
    setSoPorFechar(false)
    setResultadoId(jogo.id)
    setErroResultado('')
    setGolosCasa(String(marcador.casa))
    setGolosFora(String(marcador.fora))
    setNotaResultado(notaMarcadorOficial(marcador.houve_desempate))
    setResultadoEmRevisao({ jogoId: jogo.id, casa: marcador.casa, fora: marcador.fora, anterior: jogo })
  }

  async function consultarResultado(jogo) {
    if (ocupado || !epoca || resultadoId !== jogo.id) return
    setOcupado(true)
    setAConsultarResultado(true)
    setErroResultado('')
    setNotaResultado('')
    try {
      const { data, error } = await supabase.functions.invoke('sincronizar-calendario', {
        body: { epocaId: epoca.id, jogoId: jogo.id, acao: 'resultado' },
      })
      if (error || data?.estado !== 'disponivel' ||
        !Number.isInteger(data.casa) || data.casa < 0 || !Number.isInteger(data.fora) || data.fora < 0) {
        const resposta = error?.context instanceof Response ? await error.context.json().catch(() => null) : null
        throw new Error(resposta?.erro || 'Não foi possível obter o marcador oficial.')
      }
      setGolosCasa(String(data.casa))
      setGolosFora(String(data.fora))
      setNotaResultado(notaMarcadorOficial(data.houveDesempate))
    } catch (error) {
      setErroResultado(error.message || 'Não foi possível obter o marcador oficial.')
    } finally {
      setAConsultarResultado(false)
      setOcupado(false)
    }
  }

  function reverResultado(jogo) {
    const casa = Number(golosCasa)
    const fora = Number(golosFora)
    if (golosCasa === '' || golosFora === '' || !Number.isInteger(casa) ||
      !Number.isInteger(fora) || casa < 0 || fora < 0) {
      setErroResultado('Indica dois resultados inteiros não negativos.')
      return
    }
    if (new Date(jogo.kickoff) > new Date()) {
      setErroResultado('O jogo ainda não começou.')
      return
    }

    setErroResultado('')
    setResultadoEmRevisao({ jogoId: jogo.id, casa, fora, anterior: jogo })
  }

  async function guardarResultado(jogo, resultado) {
    if (resultado.jogoId !== jogo.id) return

    await executar(async () => {
      if (new Date(jogo.kickoff) > new Date()) throw new Error('O jogo ainda não começou.')

      const anterior = resultado.anterior
      let pedido = supabase.from('matches').update({
        home_score: resultado.casa,
        away_score: resultado.fora,
        status: 'finished',
      })
        .eq('id', jogo.id)
        .eq('season_id', epoca.id)
        .eq('kickoff', anterior.kickoff)
        .eq('status', anterior.status)

      for (const campo of ['home_score', 'away_score', 'football_data_match_id']) {
        pedido = anterior[campo] == null ? pedido.is(campo, null) : pedido.eq(campo, anterior[campo])
      }
      const { data, error } = await pedido.select('id').maybeSingle()
      if (error) throw error
      if (!data) {
        await atualizarListas(epoca.id)
        setResultadoEmRevisao(null)
        setResultadoId(null)
        throw new Error('O jogo mudou desde a revisão. Volta a verificar o marcador.')
      }

      setResultadoEmRevisao(null)
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

  const idsJornadas = new Set(jornadas.map(jornada => jornada.id))
  const jogosPorFechar = new Set(jogos.filter(jogo =>
    idsJornadas.has(jogo.jornada_id) && Date.parse(jogo.kickoff) <= agora &&
    (jogo.status === 'scheduled' || (jogo.status === 'finished' &&
      (jogo.home_score == null || jogo.away_score == null)))
  ).map(jogo => jogo.id))

  return (
    <div className="pl-jornadas">
      <style>{estilos}</style>

      <h2>📅 Gerir Jornadas — {epoca.name}</h2>

      <p className="pl-jornadas-subtitulo">
        Organiza os jogos da época ativa, escolhe os dois
        jogos bónus de cada jornada e regista os resultados.
      </p>

      <CalendarioLigaPortugal key={epoca.id} epocaId={epoca.id} atualizarJogos={() => atualizarListas(epoca.id)} />
      <ImportarJogosOficiais key={`oficiais:${epoca.id}`} epocaId={epoca.id} jornadas={jornadas} jogosDaEpoca={jogos}
        atualizarJogos={() => atualizarListas(epoca.id)} />

      <MarcadoresPorRever key={`marcadores:${epoca.id}`} epocaId={epoca.id} jogos={jogos}
        jornadas={jornadas} ocupado={ocupado} aoRever={reverMarcadorOficial} />

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

      <div className="pl-jornadas-acoes pl-jornadas-filtros" role="group" aria-label="Filtrar jogos">
        <button type="button" className="pl-jornadas-botao-secundario" aria-pressed={!soPorFechar}
          onClick={() => setSoPorFechar(false)}>Todos os jogos</button>
        <button type="button" className="pl-jornadas-botao-secundario" aria-pressed={soPorFechar}
          onClick={() => setSoPorFechar(true)}>Por fechar ({jogosPorFechar.size})</button>
      </div>

      {soPorFechar && jogosPorFechar.size === 0 && (
        <p className="pl-jornadas-vazio" role="status">Não há jogos por fechar.</p>
      )}

      {!soPorFechar && jornadas.length === 0 && (
        <p className="pl-jornadas-vazio">
          Ainda não existem jornadas nesta época.
        </p>
      )}

      {notaEmblema && <p role="status">{notaEmblema}</p>}

      {jornadas.map(jornada => {
        const jogosJornada = jogos.filter(
          j => j.jornada_id === jornada.id
        )
        const jogosVisiveis = soPorFechar ? jogosJornada.filter(jogo => jogosPorFechar.has(jogo.id)) : jogosJornada
        if (soPorFechar && jogosVisiveis.length === 0) return null

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

              {!soPorFechar && <button
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
              </button>}
            </div>

            <div className="pl-jornadas-conteudo">
              {jogosJornada.length === 0 && (
                <p className="pl-jornadas-vazio">
                  Ainda não existem jogos nesta jornada.
                </p>
              )}

              {jogosVisiveis.map(jogo => (
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
                      <EmblemaEquipa nome={jogo.home_team} origem={jogo.home_crest}
                        aoCorrigir={() => escolherEmblema(jogo, 'casa')} />
                      <span>{jogo.home_team}</span>
                    </span>

                    <span className="pl-jornadas-resultado">
                      {jogo.status === 'finished'
                        ? `${jogo.home_score} – ${jogo.away_score}`
                        : 'VS'}
                    </span>

                    <span className="pl-jornadas-equipa">
                      <EmblemaEquipa nome={jogo.away_team} origem={jogo.away_crest}
                        aoCorrigir={() => escolherEmblema(jogo, 'fora')} />
                      <span>{jogo.away_team}</span>
                    </span>
                  </div>

                  {emblema?.jogoId === jogo.id && (
                    <CorrigirEmblema key={`${jogo.id}:${emblema.lado}`} jogo={jogo} lado={emblema.lado}
                      ocupado={ocupado} aoFechar={() => setEmblema(null)}
                      aoGuardar={nome => atualizarEmblemas(nome, jogo.id, emblema.lado)} />
                  )}

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
                      disabled={ocupado}
                      onClick={() => {
                        setErroResultado('')
                        setNotaResultado('')
                        setResultadoEmRevisao(null)
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

                  {jogo.status === 'finished' && (
                    <HistoricoResultado jogoId={jogo.id} golosCasa={jogo.home_score} golosFora={jogo.away_score} />
                  )}

                  {resultadoId === jogo.id && (
                    <div className="pl-jornadas-form-extra">
                      {resultadoEmRevisao?.jogoId === jogo.id ? (
                        <>
                          <h4 ref={focoResultado} tabIndex={-1}>Confirmar resultado</h4>
                          <p role="status">
                            {jogo.home_team} <strong>{resultadoEmRevisao.casa} – {resultadoEmRevisao.fora}</strong> {jogo.away_team}
                          </p>
                          {notaResultado && <p>{notaResultado}</p>}
                          <ImpactoResultado jogoId={jogo.id} casa={resultadoEmRevisao.casa} fora={resultadoEmRevisao.fora} />
                          <div className="pl-jornadas-acoes">
                            <button type="button" className="pl-jornadas-botao-secundario"
                              disabled={ocupado} onClick={() => setResultadoEmRevisao(null)}>
                              Voltar a editar
                            </button>
                            <button type="button" className="pl-jornadas-botao"
                              disabled={ocupado} onClick={() => guardarResultado(jogo, resultadoEmRevisao)}>
                              {ocupado ? 'A publicar…' : 'Confirmar publicação'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <h4>🏁 Resultado do jogo</h4>

                          {jogo.football_data_match_id && Date.parse(jogo.kickoff) <= agora && (
                            <button type="button" className="pl-jornadas-botao-secundario" disabled={ocupado}
                              onClick={() => consultarResultado(jogo)}>
                              {aConsultarResultado ? 'A consultar…' : 'Buscar marcador oficial'}
                            </button>
                          )}
                          {notaResultado && <p role="status">{notaResultado}</p>}

                          <div className="pl-jornadas-campos">
                            <div className="pl-jornadas-campo">
                              <label htmlFor={`casa-${jogo.id}`}>
                                Golos — {jogo.home_team}
                              </label>

                              <input
                                id={`casa-${jogo.id}`}
                                ref={focoResultado}
                                className="pl-jornadas-input"
                                style={{ width: '90px' }}
                                type="number"
                                min="0"
                                step="1"
                                value={golosCasa}
                                disabled={aConsultarResultado}
                                onChange={e => {
                                  setGolosCasa(e.target.value)
                                  setErroResultado('')
                                  setNotaResultado('')
                                }}
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
                                disabled={aConsultarResultado}
                                onChange={e => {
                                  setGolosFora(e.target.value)
                                  setErroResultado('')
                                  setNotaResultado('')
                                }}
                              />
                            </div>
                          </div>

                          {erroResultado && <p role="alert">{erroResultado}</p>}

                          <button
                            type="button"
                            className="pl-jornadas-botao"
                            disabled={ocupado}
                            onClick={() => reverResultado(jogo)}
                          >
                            Rever resultado
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {!soPorFechar && selecionada === jornada.id && (
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
