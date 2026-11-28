import EmblemaEquipa from './EmblemaEquipa'
import PalpiteDaLiga from './PalpiteDaLiga'
import IconePainel from './IconePainel'
import './jogosParticipante.css'

import { Fragment, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { adicionarJogoAoCalendario } from './calendarioJogo'
import { atualizarRascunho, lerRascunho, removerRascunhoEnviado } from './rascunhosPrognosticos'


function lerPrognostico(jogo, palpite) {
  if (palpite?.casa == null || palpite.fora == null || palpite.casa === '' || palpite.fora === '') return null
  const casa = Number(palpite.casa)
  const fora = Number(palpite.fora)
  if (!Number.isInteger(casa) || !Number.isInteger(fora) || casa < 0 || fora < 0) return null
  return { match_id: jogo.id, home_goals: casa, away_goals: fora }
}

function temRascunho(palpite, guardado) {
  return (palpite?.casa ?? '') !== (guardado?.casa ?? '') ||
    (palpite?.fora ?? '') !== (guardado?.fora ?? '')
}

function formatarPrazo(milissegundos) {
  const minutos = Math.floor(milissegundos / 60000)
  if (minutos === 0) return 'Fecha em menos de 1 min'
  if (minutos < 60) return `Fecha em ${minutos} min`
  if (minutos < 1440) {
    const horas = Math.floor(minutos / 60)
    const resto = minutos % 60
    return resto ? `Fecha em ${horas} h ${resto} min` : `Fecha em ${horas} h`
  }
  const dias = Math.floor(minutos / 1440)
  return dias === 1 ? 'Fecha em 1 dia' : `Fecha em ${dias} dias`
}

const diaDoJogo = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Lisbon',
})
const horaDoJogo = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon',
})

function LinhaJogo({ jogo, aberto, alternar, golosCasa, golosFora, estado, classeEstado, palpite }) {
  const temResultado = golosCasa != null && golosFora != null
  return (
    <button type="button" className="pl-jogo-linha" aria-expanded={aberto}
      aria-controls={`detalhe-${jogo.id}`} onClick={alternar}>
      <span className="pl-jogo-linha-equipas">
        <span className="pl-jogo-linha-equipa">
          <EmblemaEquipa nome={jogo.home_team} origem={jogo.home_crest} />
          <span>{jogo.home_team}</span>
        </span>
        <span className="pl-jogo-linha-equipa">
          <EmblemaEquipa nome={jogo.away_team} origem={jogo.away_crest} />
          <span>{jogo.away_team}</span>
        </span>
      </span>
      <span className="pl-jogo-linha-marcador">
        {temResultado ? (
          <><span className="pl-jogo-etiqueta-sr">Resultado oficial: </span><strong>{golosCasa} – {golosFora}</strong><small>Final</small></>
        ) : <><time dateTime={jogo.kickoff}>{horaDoJogo.format(new Date(jogo.kickoff))}</time><small>{jogo.is_bonus ? 'Bónus ×2' : 'Jogo'}</small></>}
      </span>
      <span className="pl-jogo-linha-info">
        <span className={`pl-jogo-linha-estado ${classeEstado}`}>{estado}</span>
        {palpite && <span className="pl-jogo-linha-palpite">Palpite {palpite.casa} – {palpite.fora}</span>}
        {temResultado && jogo.is_bonus && <small className="pl-jogo-linha-palpite">Bónus ×2</small>}
      </span>
      <span className="pl-jogo-linha-seta"><IconePainel nome="avancar" tamanho={17} /></span>
    </button>
  )
}

function CampoGolos({ nome, lado, valor, desativado, alterar }) {
  const numero = valor === '' ? null : Number(valor)
  const valido = numero != null && Number.isInteger(numero) && numero >= 0
  return (
    <div className="pl-jogo-campo">
      <span>{lado}</span>
      <div className="pl-jogo-campo-controlos">
        <button type="button" className="pl-jogo-ajustar" aria-label={`Retirar um golo a ${nome}`}
          disabled={desativado || !valido || numero === 0} onClick={() => alterar(String(numero - 1))}>
          <IconePainel nome="menos" tamanho={19} />
        </button>
        <input className="pl-jogo-input" type="number" min="0" step="1" inputMode="numeric"
          aria-label={`Golos de ${nome}`} placeholder="–" value={valor} disabled={desativado}
          onChange={e => alterar(e.target.value)} />
        <button type="button" className="pl-jogo-ajustar" aria-label={`Acrescentar um golo a ${nome}`}
          disabled={desativado || (valor !== '' && !valido)} onClick={() => alterar(String(valido ? numero + 1 : 1))}>
          <IconePainel nome="mais-golo" tamanho={19} />
        </button>
      </div>
    </div>
  )
}

function EstadoGravacao({ estado }) {
  if (!estado) return null
  return (
    <p className={estado.erro ? 'pl-gravacao pl-gravacao-erro' : 'pl-gravacao'}
      role={estado.erro ? 'alert' : 'status'}>
      {estado.texto}
    </p>
  )
}

function JogosParticipante({ competicaoId, jogoDaLigacao, filtroInicial = 'todos' }) {
  const [jogos, setJogos] = useState([])
  const [jornadas, setJornadas] = useState([])
  const [palpites, setPalpites] = useState({})
  const [prognosticosGuardados, setPrognosticosGuardados] = useState({})
  const [historico, setHistorico] = useState([])
  const [filtroJogos, setFiltroJogos] = useState(filtroInicial)
  const [agora, setAgora] = useState(Date.now)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')
  const [aGuardar, setAGuardar] = useState(null)
  const [estadoGravacao, setEstadoGravacao] = useState(null)
  const [prognosticosOutros, setPrognosticosOutros] = useState({})
  const [jogoAberto, setJogoAberto] = useState(null)
  const [aCarregarPrognosticos, setACarregarPrognosticos] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const detalheAberto = detalhe && detalhe.ligacao === jogoDaLigacao ? detalhe.id : jogoDaLigacao
  const cartaoDaLigacao = useRef(null)
  const contaDosPalpites = useRef(null)

  useEffect(() => {
    if (!jogoDaLigacao || aCarregar || erro) return
    const cartao = cartaoDaLigacao.current
    const jornada = cartao?.closest('details')
    if (jornada) jornada.open = true
    cartao?.focus({ preventScroll: true })
    cartao?.scrollIntoView({ block: 'start' })
  }, [jogoDaLigacao, aCarregar, erro])

  useEffect(() => {
    let ativo = true

    async function atualizarPontos() {
      setAgora(Date.now())
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
          .eq('competition_id', competicaoId)
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
          .select('id, home_team, away_team, home_crest, away_crest, kickoff, is_bonus, jornada_id, status, home_score, away_score')
          .eq('competition_id', competicaoId)
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

        const palpitesComRascunhos = { ...palpitesGuardados }
        for (const jogo of data || []) {
          const rascunho = lerRascunho(user.id, jogo, palpitesGuardados[jogo.id])
          if (rascunho) palpitesComRascunhos[jogo.id] = rascunho
        }
        contaDosPalpites.current = user.id
        setPalpites(palpitesComRascunhos)
        setPrognosticosGuardados(palpitesGuardados)

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
  }, [competicaoId])

  function alterarPalpite(jogoId, equipa, golos) {
    const palpite = { ...palpites[jogoId], [equipa]: golos }
    atualizarRascunho(contaDosPalpites.current, jogoId, palpite, prognosticosGuardados[jogoId])
    setPalpites(anteriores => ({ ...anteriores, [jogoId]: palpite }))
    setEstadoGravacao(null)
  }

  function reporPalpite(jogoId) {
    const guardado = prognosticosGuardados[jogoId]
    atualizarRascunho(contaDosPalpites.current, jogoId, guardado, guardado)
    setPalpites(anteriores => ({ ...anteriores, [jogoId]: guardado }))
    setEstadoGravacao(null)
  }

  async function guardarPrognosticos(alvo, dados) {
    setAGuardar(alvo)
    setEstadoGravacao(null)
    try {
      const { data: { user }, error: erroUtilizador } = await supabase.auth.getUser()
      if (erroUtilizador || !user || user.id !== contaDosPalpites.current) {
        setEstadoGravacao({ alvo, erro: true, texto: 'Inicia sessão para guardar os prognósticos.' })
        return
      }

      const { error } = await supabase
        .from('predictions')
        .upsert(dados.map(dado => ({ ...dado, user_id: user.id })), { onConflict: 'match_id,user_id' })
      if (error) throw error

      for (const { match_id: jogoId } of dados) {
        removerRascunhoEnviado(user.id, jogoId, palpites[jogoId], prognosticosGuardados[jogoId])
      }
      const guardados = Object.fromEntries(dados.map(dado => [
        dado.match_id, { casa: String(dado.home_goals), fora: String(dado.away_goals) },
      ]))
      setPrognosticosGuardados(anteriores => ({ ...anteriores, ...guardados }))
      setPalpites(anteriores => ({ ...anteriores, ...guardados }))
      setEstadoGravacao({
        alvo,
        texto: dados.length === 1 ? 'Prognóstico guardado.' : `${dados.length} prognósticos guardados.`,
      })
    } catch {
      setEstadoGravacao({ alvo, erro: true, texto: 'Não foi possível guardar. Tenta novamente.' })
    } finally {
      setAGuardar(null)
    }
  }

  function guardarPalpite(jogo) {
    if (aGuardar !== null) return
    const alvo = jogo.id
    const palpite = palpites[alvo]
    if (palpite?.casa == null || palpite.fora == null || palpite.casa === '' || palpite.fora === '') {
      setEstadoGravacao({ alvo, erro: true, texto: 'Preenche os golos das duas equipas.' })
      return
    }

    const dados = lerPrognostico(jogo, palpite)
    if (!dados) {
      setEstadoGravacao({ alvo, erro: true, texto: 'Introduz números inteiros iguais ou superiores a zero.' })
      return
    }

    if (new Date(jogo.kickoff).getTime() <= Date.now()) {
      setEstadoGravacao({ alvo, erro: true, texto: 'O prazo para este jogo já terminou.' })
      return
    }

    guardarPrognosticos(alvo, [dados])
  }

  function guardarTodosPalpites(alvo, jogosDoGrupo) {
    if (aGuardar !== null) return
    const momento = Date.now()
    const dados = jogosDoGrupo
      .filter(jogo => new Date(jogo.kickoff).getTime() > momento)
      .map(jogo => lerPrognostico(jogo, palpites[jogo.id]))
      .filter(Boolean)

    if (!dados.length) {
      setEstadoGravacao({ alvo, erro: true, texto: 'Não existem prognósticos válidos para guardar.' })
      return
    }

    guardarPrognosticos(alvo, dados)
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

  const idsJornadas = new Set(jornadas.map(jornada => jornada.id))
  const porPrognosticar = new Set()
  const rascunhos = new Set()
  let jogosAbertos = 0
  for (const jogo of jogos) {
    if (jogo.status !== 'scheduled' || new Date(jogo.kickoff).getTime() <= agora ||
      !idsJornadas.has(jogo.jornada_id)) continue
    jogosAbertos += 1
    const guardado = prognosticosGuardados[jogo.id]
    if (!guardado) porPrognosticar.add(jogo.id)
    if (temRascunho(palpites[jogo.id], guardado)) rascunhos.add(jogo.id)
  }

  const guardadosAbertos = jogosAbertos - porPrognosticar.size

  const jogosFiltrados = jogos.filter(jogo => {
    if (filtroJogos === 'por-jogar') {
      return new Date(jogo.kickoff).getTime() > agora
    }

    if (filtroJogos === 'por-prognosticar') {
      return porPrognosticar.has(jogo.id)
    }

    if (filtroJogos === 'rascunhos') {
      return rascunhos.has(jogo.id)
    }

    if (filtroJogos === 'terminados') {
      return jogo.status === 'finished'
    }

    return true
  })

  const mostrarPendentes = filtroJogos === 'por-prognosticar'
  const mostrarRascunhos = filtroJogos === 'rascunhos'
  const mostrarPorPrazo = mostrarPendentes || mostrarRascunhos
  const grupos = mostrarPorPrazo
    ? (jogosFiltrados.length ? [{
        id: filtroJogos,
        nome: mostrarRascunhos ? 'Rascunhos com prazo aberto' : 'Jogos por prognosticar',
        jogos: jogosFiltrados.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)),
      }] : [])
    : jornadas
      .map(jornada => ({
        ...jornada,
        jogos: jogosFiltrados.filter(jogo => jogo.jornada_id === jornada.id),
      }))
      .filter(jornada => jornada.jogos.length > 0)
  const mensagemForaDosCartoes = estadoGravacao && !grupos.some(grupo =>
    estadoGravacao.alvo === `grupo:${grupo.id}` || grupo.jogos.some(jogo =>
      estadoGravacao.alvo === jogo.id && detalheAberto === jogo.id && new Date(jogo.kickoff).getTime() > agora
    )
  )
  const jogoDaLigacaoDisponivel = jogoDaLigacao && jogos.some(jogo =>
    jogo.id === jogoDaLigacao && jornadas.some(jornada => jornada.id === jogo.jornada_id)
  )

  if (aCarregar) {
    return <p className="pl-jogos-mensagem" role="status">A carregar os jogos…</p>
  }

  if (erro) {
    return <p className="pl-jogos-mensagem pl-jogos-erro" role="alert">{erro}</p>
  }

  return (
    <div className="pl-jogos">
      <header className="pl-jogos-header">
        <p className="pl-jogos-kicker">Centro de jogos</p>
        <h2 className="pl-jogos-titulo">Os meus prognósticos</h2>
        <p className="pl-jogos-subtitulo">Faz os teus palpites e acompanha os resultados.</p>
      </header>

      <section className="pl-jogos-resumo" aria-label="Prognósticos dos jogos futuros">
        <div className="pl-jogos-resumo-numeros">
          <div><span className="pl-jogos-resumo-icon"><IconePainel nome="prognosticos" tamanho={20} /></span><strong>{porPrognosticar.size}</strong><span>Por preencher</span></div>
          <div><span className="pl-jogos-resumo-icon guardado"><IconePainel nome="visto" tamanho={20} /></span><strong>{guardadosAbertos}</strong><span>Guardados</span></div>
          <div><span className="pl-jogos-resumo-icon"><IconePainel nome="jornadas" tamanho={20} /></span><strong>{jogosAbertos}</strong><span>Jogos futuros</span></div>
        </div>
        {jogosAbertos > 0 ? (
          <div className="pl-jogos-progresso">
            <progress max={jogosAbertos} value={guardadosAbertos} aria-label="Prognósticos guardados" />
            <p>{guardadosAbertos} de {jogosAbertos} guardados {porPrognosticar.size === 0 && <span><IconePainel nome="visto" tamanho={16} /> Tudo em dia</span>}</p>
          </div>
        ) : <p className="pl-jogos-progresso-vazio">Sem jogos futuros com prognósticos abertos.</p>}
      </section>

      {jogoDaLigacao && !jogoDaLigacaoDisponivel && (
        <p role="status">O jogo selecionado já não está disponível na época ativa.</p>
      )}

      <div className="pl-jogos-filtros" role="group" aria-label="Filtrar jogos">
        {[
          ['todos', 'Todos', null],
          ['por-jogar', 'Por jogar', null],
          ['por-prognosticar', 'Em falta', porPrognosticar.size],
          ['rascunhos', 'Rascunhos', rascunhos.size],
          ['terminados', 'Terminados', null],
        ].map(([valor, nome, contagem]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={filtroJogos === valor}
            className={
              `pl-jogos-filtro ${filtroJogos === valor ? 'ativo' : ''}`
            }
            onClick={() => setFiltroJogos(valor)}
          >
            {nome}{contagem != null && <span className="pl-jogos-filtro-count">{contagem}</span>}
          </button>
        ))}
      </div>

      {mensagemForaDosCartoes && <EstadoGravacao estado={estadoGravacao} />}

      {grupos.length === 0 ? (
        <p className="pl-jogos-mensagem" role="status">{mostrarPendentes
          ? 'Não tens prognósticos em falta para os jogos com prazo aberto.'
          : mostrarRascunhos
            ? 'Não tens rascunhos com prazo aberto.'
            : 'Não existem jogos para o filtro selecionado.'}</p>
      ) : (
        grupos.map(jornada => (
          <details key={jornada.id} open className="pl-jornada">
            <summary className="pl-jornada-summary">
              <span className="pl-jornada-identidade"><IconePainel nome="jornadas" tamanho={19} /><strong>{jornada.nome || `Jornada ${jornada.numero}`}</strong></span>
              <span className="pl-jornada-total">{jornada.jogos.length} {jornada.jogos.length === 1 ? 'jogo' : 'jogos'}</span>
              <span className="pl-jornada-seta"><IconePainel nome="avancar" tamanho={17} /></span>
            </summary>

            <div className="pl-jornada-conteudo">
              <div className="pl-jornada-acoes">
                {jornada.jogos.some(j => new Date(j.kickoff).getTime() > agora) && <button
                  type="button"
                  className="pl-jogo-botao"
                  onClick={() => guardarTodosPalpites(`grupo:${jornada.id}`, jornada.jogos)}
                  disabled={aGuardar !== null}
                >
                  {aGuardar === `grupo:${jornada.id}`
                    ? 'A guardar prognósticos…'
                    : mostrarRascunhos ? 'Guardar rascunhos completos' : 'Guardar todos os prognósticos'}
                  <IconePainel nome="visto" tamanho={18} />
                </button>}
                {estadoGravacao?.alvo === `grupo:${jornada.id}` && <EstadoGravacao estado={estadoGravacao} />}
              </div>
              {jornada.jogos.map((jogo, indice) => {
                const dia = diaDoJogo.format(new Date(jogo.kickoff))
                const anterior = jornada.jogos[indice - 1]
                const novoDia = !anterior || diaDoJogo.format(new Date(anterior.kickoff)) !== dia
                const tempoRestante = new Date(jogo.kickoff).getTime() - agora
                const comecou = tempoRestante <= 0

                const resultado = historico.find(
                  item => item.match_id === jogo.id
                )
                const jogoEmDestaque = jogo.id === jogoDaLigacao
                const guardado = prognosticosGuardados[jogo.id]
                const palpite = palpites[jogo.id]
                const rascunho = temRascunho(palpite, guardado)
                const gravacaoDoJogo = estadoGravacao?.alvo === jogo.id ? estadoGravacao : null
                const temMarcador = jogo.status === 'finished' && jogo.home_score != null && jogo.away_score != null
                const golosCasa = temMarcador ? jogo.home_score : resultado?.home_score
                const golosFora = temMarcador ? jogo.away_score : resultado?.away_score
                const podePrognosticar = jogo.status === 'scheduled' && tempoRestante > 0

                const aberto = detalheAberto === jogo.id
                const estado = podePrognosticar
                  ? rascunho ? 'Rascunho' : guardado ? 'Guardado' : 'Em falta'
                  : !guardado ? 'Sem palpite' : resultado?.points != null
                    ? `+${resultado.points} pts`
                    : 'Encerrado'
                const classeEstado = podePrognosticar
                  ? rascunho ? 'rascunho' : guardado ? 'guardado' : 'pendente'
                  : resultado?.points != null && guardado ? resultado.exact_score ? 'exato' : resultado.points > 0 ? 'guardado' : 'sem-pontos' : 'neutro'

                const cartao = aberto ? (
                  <div id={`detalhe-${jogo.id}`} className="pl-jogo-cartao"
                    ref={jogoEmDestaque ? cartaoDaLigacao : undefined}
                    tabIndex={jogoEmDestaque ? -1 : undefined}
                    role={jogoEmDestaque ? 'group' : undefined}
                    aria-label={jogoEmDestaque ? `${jogo.home_team} vs ${jogo.away_team}` : undefined}
                  >
                    <div className="pl-jogo-topo">
                      <time className="pl-jogo-data" dateTime={jogo.kickoff}>
                        {new Date(jogo.kickoff).toLocaleString('pt-PT', {
                          dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Lisbon',
                        })}
                      </time>

                      {podePrognosticar && (mostrarPorPrazo || tempoRestante <= 3600000) && (
                        <span className={tempoRestante <= 3600000 ? 'pl-jogo-prazo pl-jogo-prazo-urgente' : 'pl-jogo-prazo'}>
                          {formatarPrazo(tempoRestante)}
                        </span>
                      )}

                      {podePrognosticar && (!gravacaoDoJogo || gravacaoDoJogo.erro) && (
                        <span className={`pl-palpite-estado ${rascunho ? 'pl-palpite-rascunho' : guardado ? 'pl-palpite-guardado' : ''}`}>
                          {rascunho ? 'Alterações por guardar' : guardado ? 'Guardado' : 'Por preencher'}
                        </span>
                      )}

                      {jogo.is_bonus && (
                        <span className="pl-jogo-bonus">
                          <IconePainel nome="conquistas" tamanho={16} /> Jogo bónus · ×2
                        </span>
                      )}
                    </div>

                    <div className="pl-jogo-equipas">
                      <span className="pl-jogo-equipa">
                        <EmblemaEquipa nome={jogo.home_team} origem={jogo.home_crest} />
                        {jogo.home_team}
                      </span>

                      {golosCasa != null && golosFora != null ? (
                        <span className="pl-jogo-marcador">
                          <span className="pl-jogo-etiqueta-sr">Resultado oficial: </span>{golosCasa}–{golosFora}
                        </span>
                      ) : <span className="pl-jogo-versus">VS</span>}

                      <span className="pl-jogo-equipa">
                        <EmblemaEquipa nome={jogo.away_team} origem={jogo.away_crest} />
                        {jogo.away_team}
                      </span>
                    </div>

                    {resultado && resultado.points !== null && (
                      <div className={`pl-jogo-resultado ${resultado.exact_score ? 'exato' : resultado.points > 0 ? 'positivo' : 'negativo'}`}>
                        <div>
                          <span className="pl-jogos-kicker">O teu prognóstico</span>
                          <strong className="pl-jogo-resultado-palpite">{guardado ? `${guardado.casa} – ${guardado.fora}` : '—'}</strong>
                          <p>{resultado.exact_score ? 'Resultado exato!' : resultado.points > 0 ? 'Tendência certa!' : 'Sem acerto'}</p>
                        </div>
                        <div className="pl-jogo-resultado-pontos">
                          <IconePainel nome="liga" tamanho={23} />
                          <strong className="pl-jogo-pontos">+{resultado.points}</strong>
                          <span>{resultado.points === 1 ? 'ponto' : 'pontos'}</span>
                        </div>
                      </div>
                    )}

                    <div className="pl-jogo-divisor" />

                    {!comecou ? (
                      <div>
                        <p className="pl-jogo-palpite-titulo">O teu prognóstico</p>
                        <div className="pl-jogo-inputs">
                          <CampoGolos nome={jogo.home_team} lado="Casa" valor={palpites[jogo.id]?.casa ?? ''}
                            desativado={aGuardar !== null} alterar={valor => alterarPalpite(jogo.id, 'casa', valor)} />
                          <span className="pl-jogo-input-separador" aria-hidden="true">–</span>
                          <CampoGolos nome={jogo.away_team} lado="Fora" valor={palpites[jogo.id]?.fora ?? ''}
                            desativado={aGuardar !== null} alterar={valor => alterarPalpite(jogo.id, 'fora', valor)} />
                        </div>

                        <div className="pl-jogo-rodape">
                          <button
                            type="button"
                            className="pl-jogo-botao"
                            onClick={() => guardarPalpite(jogo)}
                            disabled={aGuardar !== null}
                          >
                            {aGuardar === jogo.id
                              ? 'A guardar...'
                              : 'Guardar prognóstico'}
                            <IconePainel nome="visto" tamanho={19} />
                          </button>
                          {guardado && rascunho && (
                            <button type="button" className="pl-jogo-secundario pl-palpite-repor"
                              disabled={aGuardar !== null} onClick={() => reporPalpite(jogo.id)}>
                              Repor prognóstico guardado
                            </button>
                          )}
                          {podePrognosticar && (
                            <button type="button" className="pl-jogo-secundario"
                              onClick={() => adicionarJogoAoCalendario(jogo)}><IconePainel nome="jornadas" tamanho={17} /> Adicionar ao calendário</button>
                          )}
                          <EstadoGravacao estado={gravacaoDoJogo} />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="pl-jogo-encerrado">
                          <IconePainel nome="cadeado" tamanho={17} /> Prognósticos encerrados — o jogo já começou.
                        </p>

                        <PalpiteDaLiga key={jogo.id} jogo={jogo} />
                        <button
                          type="button"
                          className="pl-jogo-secundario"
                          onClick={() => verPrognosticos(jogo)}
                          disabled={aCarregarPrognosticos === jogo.id}
                        >
                          {aCarregarPrognosticos === jogo.id
                            ? 'A carregar...'
                            : jogoAberto === jogo.id
                              ? 'Fechar prognósticos'
                              : 'Ver prognósticos'}
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
                ) : <div id={`detalhe-${jogo.id}`} hidden />

                return (
                  <Fragment key={jogo.id}>
                    {novoDia && <h3 className="pl-jogos-dia">{dia}</h3>}
                    <LinhaJogo jogo={jogo} aberto={aberto} estado={estado} classeEstado={classeEstado} palpite={guardado} golosCasa={golosCasa} golosFora={golosFora}
                      alternar={() => setDetalhe({ ligacao: jogoDaLigacao, id: aberto ? null : jogo.id })} />
                    {cartao}
                  </Fragment>
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
