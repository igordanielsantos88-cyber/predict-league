import { lazy, useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import SecaoCarregavel from './SecaoCarregavel'
import InicioPainel from './InicioPainel'
import { BarraPainel, SecoesPainel } from './NavegacaoPainel'
const JogosParticipante = lazy(() => import('./JogosParticipante'))
const Liga = lazy(() => import('./Liga'))
const Participantes = lazy(() => import('./Participantes'))
const Jornadas = lazy(() => import('./Jornadas'))
const HallDaFama = lazy(() => import('./HallDaFama'))
const Estatisticas = lazy(() => import('./Estatisticas'))
const Duelo = lazy(() => import('./Duelo'))
const Conquistas = lazy(() => import('./Conquistas'))
const Notificacoes = lazy(() => import('./Notificacoes'))
const Chat = lazy(() => import('./Chat'))
const GerirCompeticoes = lazy(() => import('./GerirCompeticoes'))
const DiagnosticoPush = lazy(() => import('./DiagnosticoPush'))

const secoes = [
  { id: 'competicoes', icone: '🏆', nome: 'Gerir Competições', descricao: 'Cria e gere as competições' },
  { id: 'prognosticos', icone: '🎯', nome: 'Prognósticos', descricao: 'Consulta os jogos e faz os teus palpites' },
  { id: 'liga', icone: '🏆', nome: 'Classificação', descricao: 'Acompanha a tabela da competição' },
  { id: 'jornadas', icone: '📅', nome: 'Jornadas', descricao: 'Gere as jornadas e os jogos' },
  { id: 'participantes', icone: '👥', nome: 'Participantes', descricao: 'Consulta e aprova participantes' },
  { id: 'notificacoes', icone: '🔔', nome: 'Notificações', descricao: 'Consulta os teus avisos de jogos, resultados e lembretes' },
  { id: 'diagnostico-push', icone: '📡', nome: 'Diagnóstico de push', descricao: 'Acompanha a fila e as falhas dos avisos push' },
  { id: 'conquistas', icone: '🏅', nome: 'Conquistas', descricao: 'Descobre as tuas medalhas e acompanha o teu progresso' },
  { id: 'duelo', icone: '⚔️', nome: 'Duelo', descricao: 'Compara o teu desempenho com outro participante' },
  { id: 'estatisticas', icone: '📊', nome: 'Estatísticas', descricao: 'Consulta os números da competição' },
  { id: 'hall-da-fama', icone: '🥇', nome: 'Hall da Fama', descricao: 'Consulta os campeões das épocas anteriores' },
  { id: 'chat', icone: '💬', nome: 'Chat', descricao: 'Conversa com os participantes' },
]

const estilos = `
  .pl-dashboard { min-height:100vh; box-sizing:border-box; background:radial-gradient(ellipse at 50% 0%,#262013 0%,transparent 45%),#090d16; color:#f8fafc; padding:28px; padding-bottom:var(--pl-espaco-barra, 28px); font-family:Arial,sans-serif; }
  .pl-dashboard * { box-sizing:border-box; }
  .pl-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:28px; }
  .pl-logo { display:flex; align-items:center; gap:12px; }
  .pl-logo-icon { width:52px; height:52px; display:grid; place-items:center; background:linear-gradient(135deg,#d4af37,#8f6b1f); border-radius:15px; font-size:27px; box-shadow:0 6px 24px #d4af3726; }
  .pl-logo h1 { margin:0; color:#e8c76a; font-size:clamp(22px,4vw,30px); letter-spacing:-.6px; }
  .pl-subtitle { margin:5px 0 0; color:#94a3b8; font-size:13px; }
  .pl-hero h2 { font-size:clamp(26px,5vw,38px); margin:12px 0; line-height:1.2; }
  .pl-hero p { color:#cbd5e1; font-size:15px; line-height:1.7; margin:0 0 24px; }
  .pl-gold-button { background:linear-gradient(135deg,#f0d477,#c69c32); color:#211806; border:0; border-radius:11px; padding:13px 22px; font-weight:bold; font-size:14px; cursor:pointer; transition:transform .2s,box-shadow .2s; }
  .pl-gold-button:hover { transform:translateY(-2px); box-shadow:0 8px 25px #d4af3740; }
  .pl-section-heading { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin:0 0 16px; }
  .pl-section-title { color:#f8fafc; font-size:20px; margin:0; }
  .pl-refresh { border:1px solid #594821; background:#1b2535; color:#e8c76a; border-radius:9px; padding:9px 13px; cursor:pointer; font-weight:bold; }
  .pl-refresh:disabled { opacity:.55; cursor:wait; }
  button.pl-stat { text-align:left; font:inherit; border-color:#8f722e; cursor:pointer; }
  button.pl-stat:hover { border-color:#f0d477; }
  button.pl-stat:focus-visible { outline:2px solid #f0d477; outline-offset:3px; }
  button.pl-stat:disabled { opacity:.55; cursor:default; }
  .pl-info { color:#94a3b8; font-size:13px; margin:-12px 0 22px; }
  .pl-info-error { color:#fca5a5; }
  .pl-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
  .pl-card { display:flex; flex-direction:column; align-items:flex-start; background:linear-gradient(145deg,#1b2535,#111722); border:1px solid #3d3b30; border-radius:18px; padding:22px; color:#f8fafc; text-align:left; cursor:pointer; min-height:175px; width:100%; transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease; }
  .pl-card:hover { transform:translateY(-4px); border-color:#d4af37; box-shadow:0 12px 32px #00000045; }
  .pl-card-icon { display:inline-grid; place-items:center; width:46px; height:46px; background:#d4af3717; border:1px solid #d4af3735; border-radius:13px; font-size:23px; margin-bottom:15px; }
  .pl-card h3 { margin:0 0 8px; color:#e8c76a; font-size:17px; }
  .pl-card p { color:#94a3b8; font-size:13px; line-height:1.6; margin:0; }
  .pl-card:last-child { grid-column:span 2; }
  .pl-back { background:#1b2535; border:1px solid #8f722e; color:#e8c76a; border-radius:10px; padding:11px 17px; cursor:pointer; font-weight:bold; }
  .pl-content { background:#131c2b; border:1px solid #3d3b30; border-radius:18px; padding:22px; min-width:0; }
  .pl-card:focus-visible,.pl-gold-button:focus-visible,.pl-back:focus-visible,.pl-refresh:focus-visible { outline:2px solid #f0d477; outline-offset:3px; }
  @media (max-width:1000px) { .pl-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .pl-card:last-child { grid-column:auto; } }
  @media (max-width:600px) { .pl-dashboard { padding-inline:16px; padding-top:16px; } .pl-header { margin-bottom:22px; } .pl-logo-icon { width:44px; height:44px; } .pl-grid { gap:12px; } .pl-card { min-height:155px; padding:16px; } .pl-card-icon { width:42px; height:42px; margin-bottom:12px; } .pl-card h3 { font-size:15px; } .pl-card p { font-size:12px; } .pl-content { padding:12px; } }
  @media (max-width:360px) { .pl-grid { grid-template-columns:1fr; } }
  @media (prefers-reduced-motion:reduce) { .pl-card,.pl-gold-button { transition:none; } .pl-card:hover,.pl-gold-button:hover { transform:none; } }
`

function Dashboard({ pedidoNotificacoes = 0, atualizarSino, naoLidasTotal, destino, limparLigacao }) {
  const [pagina, setPagina] = useState(() => {
    if (destino?.tipo === 'jogo') return 'prognosticos'
    if (destino?.tipo === 'jornada') return 'liga'
    return 'inicio'
  })
  useEffect(() => {
    if (pedidoNotificacoes > 0) setPagina('notificacoes')
  }, [pedidoNotificacoes])
  const [competicaoId, setCompeticaoId] = useState(null)
  const [jogoDoPainel, setJogoDoPainel] = useState(null)
  const [erroCompeticao, setErroCompeticao] = useState('')
  const [aCarregarCompeticao, setACarregarCompeticao] = useState(true)
  const [resumo, setResumo] = useState({ posicao: null, pontos: null, proximos: [], porFazer: null })
  const [aCarregarResumo, setACarregarResumo] = useState(true)
  const [erroResumo, setErroResumo] = useState('')
  const [atualizacao, setAtualizacao] = useState(0)

  useEffect(() => {
    let ativo = true

    async function carregarCompeticaoAtiva() {
      const { data, error } = await supabase
        .from('competitions')
        .select('id')
        .eq('active', true)
        .limit(2)

      if (!ativo) return
      if (error) {
        setErroCompeticao(error.message)
      } else if (!data?.length) {
        setErroCompeticao('Não foi encontrada uma competição ativa acessível.')
      } else if (data.length > 1) {
        setErroCompeticao('Existem várias competições ativas. É necessário escolher uma antes de continuar.')
      } else {
        setCompeticaoId(data[0].id)
        setErroCompeticao('')
      }
      setACarregarCompeticao(false)
    }

    carregarCompeticaoAtiva()
    return () => { ativo = false }
  }, [])

  const carregarResumo = useCallback(async (signal) => {
    if (!competicaoId) return
    setACarregarResumo(true)
    setErroResumo('')
    try {
      const { data: { user }, error: erroUser } = await supabase.auth.getUser()
      if (erroUser || !user) throw new Error('Não foi possível identificar o utilizador.')

      const [resultadoClassificacao, resultadoEpoca] = await Promise.all([
        supabase.rpc('obter_classificacao', { p_competition_id: competicaoId }),
        supabase.from('seasons').select('id').eq('competition_id', competicaoId).eq('status', 'active').maybeSingle(),
      ])
      if (resultadoClassificacao.error) throw resultadoClassificacao.error
      if (resultadoEpoca.error) throw resultadoEpoca.error
      if (signal.aborted) return

      const tabela = resultadoClassificacao.data || []
      const indice = tabela.findIndex(jogador => jogador.user_id === user.id)
      const meusDados = indice >= 0 ? tabela[indice] : null
      let proximos = []
      let porFazer = 0

      if (resultadoEpoca.data?.id) {
        const { data: jogos, error: erroJogos } = await supabase
          .from('matches')
          .select('id,home_team,away_team,home_crest,away_crest,kickoff')
          .eq('competition_id', competicaoId)
          .eq('season_id', resultadoEpoca.data.id)
          .eq('status', 'scheduled')
          .not('jornada_id', 'is', null)
          .gt('kickoff', new Date().toISOString())
          .order('kickoff', { ascending: true })
        if (erroJogos) throw erroJogos
        if (signal.aborted) return

        const futuros = jogos || []
        if (futuros.length) {
          const ids = futuros.map(jogo => jogo.id)
          const { data: palpites, error: erroPalpites } = await supabase
            .from('predictions')
            .select('match_id')
            .eq('user_id', user.id)
            .in('match_id', ids)
          if (erroPalpites) throw erroPalpites
          if (signal.aborted) return
          const preenchidos = new Set((palpites || []).map(p => p.match_id))
          porFazer = futuros.filter(jogo => !preenchidos.has(jogo.id)).length
          proximos = futuros.slice(0, 4).map(jogo => ({ ...jogo, prognosticado: preenchidos.has(jogo.id) }))
        }
      }

      if (!signal.aborted) {
        setResumo({
          posicao: indice >= 0 ? indice + 1 : null,
          pontos: meusDados ? Number(meusDados.pontos) : null,
          proximos,
          porFazer,
        })
      }
    } catch (error) {
      if (!signal.aborted) setErroResumo(error?.message || 'Não foi possível carregar o resumo.')
    } finally {
      if (!signal.aborted) setACarregarResumo(false)
    }
  }, [competicaoId])

  useEffect(() => {
    if (pagina !== 'inicio' || !competicaoId) return
    const controller = new AbortController()
    carregarResumo(controller.signal)
    return () => controller.abort()
  }, [pagina, atualizacao, carregarResumo])

  const componentes = {
    competicoes: <GerirCompeticoes />,
    'diagnostico-push': <DiagnosticoPush />,
    prognosticos: <JogosParticipante competicaoId={competicaoId} jogoDaLigacao={destino?.tipo === 'jogo' ? destino.id : null} />,
    'prognosticos-pendentes': <JogosParticipante competicaoId={competicaoId} filtroInicial="por-prognosticar" />,
    'proximo-jogo': <JogosParticipante competicaoId={competicaoId} jogoDaLigacao={jogoDoPainel} />,
    liga: <Liga competicaoId={competicaoId} jornadaInicial={destino?.tipo === 'jornada' ? destino.id : null} />,
    jornadas: <Jornadas competicaoId={competicaoId} />,
    participantes: <Participantes competicaoId={competicaoId} />,
    estatisticas: <Estatisticas competicaoId={competicaoId} />,
    duelo: <Duelo competicaoId={competicaoId} />,
    conquistas: <Conquistas competicaoId={competicaoId} />,
    notificacoes: <Notificacoes atualizarSino={atualizarSino} naoLidasTotal={naoLidasTotal} />,
    'hall-da-fama': <HallDaFama competicaoId={competicaoId} />,
    chat: <Chat />,
     }
  const secaoAtual = secoes.find(s => s.id === (['prognosticos-pendentes', 'proximo-jogo'].includes(pagina) ? 'prognosticos' : pagina))
  function abrir(secao, jogoId = null) {
    limparLigacao()
    setJogoDoPainel(jogoId)
    setPagina(secao)
    window.scrollTo(0, 0)
  }

  const estaDisponivel = secao => Boolean(competicaoId) ||
    ['competicoes', 'diagnostico-push', 'notificacoes'].includes(secao)

  return (
    <div className="pl-dashboard">
      <style>{estilos}</style>
      <header className="pl-header">
        <div className="pl-logo">
          <div className="pl-logo-icon">⚽</div>
          <div>
            <h1>Predict League</h1>
            <p className="pl-subtitle">A tua liga de prognósticos</p>
          </div>
        </div>
        {pagina !== 'inicio' && (
          <button type="button" className="pl-back" onClick={() => abrir('inicio')}>← Dashboard</button>
        )}
      </header>

      {erroCompeticao && <p className="pl-info pl-info-error" role="alert">{erroCompeticao}</p>}
      {aCarregarCompeticao && <p className="pl-info">A identificar a competição ativa...</p>}

      {pagina === 'inicio' ? (
        <>
          <InicioPainel resumo={resumo} aCarregar={aCarregarCompeticao || (Boolean(competicaoId) && aCarregarResumo)}
            erro={erroResumo} competicaoId={competicaoId} abrir={abrir} atualizar={() => setAtualizacao(n => n + 1)} />
          <SecoesPainel secoes={secoes} abrir={abrir} estaDisponivel={estaDisponivel} />
        </>
      ) : pagina === 'mais' ? (
        <SecoesPainel secoes={secoes} abrir={abrir} estaDisponivel={estaDisponivel} outras />
      ) : (
        <main className="pl-content">
          {pagina !== 'liga' && <h2 style={{ color: '#e8c76a', marginTop: 0, marginBottom: '22px' }}>
            {secaoAtual?.icone} {secaoAtual?.nome}
          </h2>}
          {estaDisponivel(pagina)
            ? <SecaoCarregavel key={pagina}>{componentes[pagina]}</SecaoCarregavel>
            : <p>A aguardar uma competição ativa.</p>}
        </main>
      )}
      <BarraPainel pagina={pagina} abrir={abrir} naoLidas={naoLidasTotal} />
    </div>
  )
}

export default Dashboard
