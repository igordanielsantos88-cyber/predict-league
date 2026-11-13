import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import JogosParticipante from './JogosParticipante'
import Liga from './Liga'
import HallDaFama from './HallDaFama'
import Estatisticas from './Estatisticas'
import Chat from './Chat'



const secoes = [
  { id: 'prognosticos', icone: '🎯', nome: 'Prognósticos', descricao: 'Consulta os jogos e faz os teus palpites' },
  { id: 'liga', icone: '🏆', nome: 'Classificação', descricao: 'Acompanha a tabela da competição' },
  { id: 'estatisticas', icone: '📊', nome: 'Estatísticas', descricao: 'Consulta os números da competição' },
  { id: 'hall-da-fama', icone: '🥇', nome: 'Hall da Fama', descricao: 'Consulta os campeões das épocas anteriores' },
  { id: 'chat', icone: '💬', nome: 'Chat', descricao: 'Conversa com os participantes' },
]

const estilos = `
  .pl-dashboard { min-height:100vh; box-sizing:border-box; background:radial-gradient(ellipse at 50% 0%,#262013 0%,transparent 45%),#090d16; color:#f8fafc; padding:28px; font-family:Arial,sans-serif; }
  .pl-dashboard * { box-sizing:border-box; }
  .pl-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:28px; }
  .pl-logo { display:flex; align-items:center; gap:12px; }
  .pl-logo-icon { width:52px; height:52px; display:grid; place-items:center; background:linear-gradient(135deg,#d4af37,#8f6b1f); border-radius:15px; font-size:27px; box-shadow:0 6px 24px #d4af3726; }
  .pl-logo h1 { margin:0; color:#e8c76a; font-size:clamp(22px,4vw,30px); letter-spacing:-.6px; }
  .pl-subtitle { margin:5px 0 0; color:#94a3b8; font-size:13px; }
  .pl-hero { position:relative; overflow:hidden; background:linear-gradient(120deg,#1b2231,#302718 75%,#453317); border:1px solid #8f722e; border-radius:22px; padding:clamp(24px,5vw,42px); margin-bottom:24px; box-shadow:0 12px 40px #00000030; }
  .pl-hero::after { content:'🏆'; position:absolute; right:5%; top:50%; transform:translateY(-50%); font-size:clamp(90px,16vw,180px); opacity:.12; pointer-events:none; }
  .pl-hero-content { position:relative; z-index:1; max-width:650px; }
  .pl-eyebrow { color:#e8c76a; font-size:12px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; }
  .pl-hero h2 { font-size:clamp(26px,5vw,38px); margin:12px 0; line-height:1.2; }
  .pl-hero p { color:#cbd5e1; font-size:15px; line-height:1.7; margin:0 0 24px; }
  .pl-gold-button { background:linear-gradient(135deg,#f0d477,#c69c32); color:#211806; border:0; border-radius:11px; padding:13px 22px; font-weight:bold; font-size:14px; cursor:pointer; transition:transform .2s,box-shadow .2s; }
  .pl-gold-button:hover { transform:translateY(-2px); box-shadow:0 8px 25px #d4af3740; }
  .pl-section-heading { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin:0 0 16px; }
  .pl-section-title { color:#f8fafc; font-size:20px; margin:0; }
  .pl-refresh { border:1px solid #594821; background:#1b2535; color:#e8c76a; border-radius:9px; padding:9px 13px; cursor:pointer; font-weight:bold; }
  .pl-refresh:disabled { opacity:.55; cursor:wait; }
  .pl-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:28px; }
  .pl-stat { background:linear-gradient(145deg,#1b2535,#111722); border:1px solid #3d3b30; border-radius:16px; padding:20px; min-width:0; }
  .pl-stat-icon { font-size:22px; display:block; margin-bottom:12px; }
  .pl-stat-label { display:block; color:#a7b5c9; font-size:13px; margin-bottom:9px; }
  .pl-stat-value { display:block; color:#f0d477; font-size:clamp(21px,2.5vw,29px); font-weight:bold; line-height:1.2; overflow-wrap:anywhere; }
  .pl-stat-detail { display:block; color:#94a3b8; font-size:12px; line-height:1.5; margin-top:8px; overflow-wrap:anywhere; }
  .pl-info { color:#94a3b8; font-size:13px; margin:-12px 0 22px; }
  .pl-info-error { color:#fca5a5; }
  .pl-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
  .pl-card { display:flex; flex-direction:column; align-items:flex-start; background:linear-gradient(145deg,#1b2535,#111722); border:1px solid #3d3b30; border-radius:18px; padding:22px; color:#f8fafc; text-align:left; cursor:pointer; min-height:175px; width:100%; transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease; }
  .pl-card:hover { transform:translateY(-4px); border-color:#d4af37; box-shadow:0 12px 32px #00000045; }
  .pl-card-icon { display:inline-grid; place-items:center; width:46px; height:46px; background:#d4af3717; border:1px solid #d4af3735; border-radius:13px; font-size:23px; margin-bottom:15px; }
  .pl-card h3 { margin:0 0 8px; color:#e8c76a; font-size:17px; }
  .pl-card p { color:#94a3b8; font-size:13px; line-height:1.6; margin:0; }
 
  .pl-back { background:#1b2535; border:1px solid #8f722e; color:#e8c76a; border-radius:10px; padding:11px 17px; cursor:pointer; font-weight:bold; }
  .pl-content { background:#131c2b; border:1px solid #3d3b30; border-radius:18px; padding:22px; min-width:0; }
  .pl-card:focus-visible,.pl-gold-button:focus-visible,.pl-back:focus-visible,.pl-refresh:focus-visible { outline:2px solid #f0d477; outline-offset:3px; }
  @media (max-width:1000px) { .pl-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } .pl-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .pl-card:last-child { grid-column:auto; } }
  @media (max-width:600px) { .pl-dashboard { padding:16px; } .pl-header { margin-bottom:22px; } .pl-logo-icon { width:44px; height:44px; } .pl-hero::after { right:-20px; opacity:.07; } .pl-stats { gap:10px; } .pl-stat { padding:15px; } .pl-stat-value { font-size:23px; } .pl-grid { gap:12px; } .pl-card { min-height:155px; padding:16px; } .pl-card-icon { width:42px; height:42px; margin-bottom:12px; } .pl-card h3 { font-size:15px; } .pl-card p { font-size:12px; } .pl-content { padding:12px; } }
  @media (max-width:360px) { .pl-grid { grid-template-columns:1fr; } }
  @media (prefers-reduced-motion:reduce) { .pl-card,.pl-gold-button { transition:none; } .pl-card:hover,.pl-gold-button:hover { transform:none; } }
`

function PainelParticipante() {
  const [pagina, setPagina] = useState('inicio')
  const [competicaoId, setCompeticaoId] = useState(null)
  const [resumo, setResumo] = useState({ posicao: null, pontos: null, proximo: null, porFazer: null, totalJogos: 0 })
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
      console.error('Erro ao carregar competição:', error.message)
    } else if (data?.length === 1) {
      setCompeticaoId(data[0].id)
    } else {
      console.error('Não foi possível identificar uma única competição ativa.')
    }
  }

  carregarCompeticaoAtiva()

  return () => {
    ativo = false
  }
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
      let proximo = null
      let porFazer = 0
      let totalJogos = 0

      if (resultadoEpoca.data?.id) {
        const { data: jogos, error: erroJogos } = await supabase
          .from('matches')
          .select('id,home_team,away_team,kickoff,status')
          .eq('competition_id', competicaoId)
.eq('season_id', resultadoEpoca.data.id)
          .gt('kickoff', new Date().toISOString())
          .order('kickoff', { ascending: true })
        if (erroJogos) throw erroJogos
        if (signal.aborted) return

        const futuros = (jogos || []).filter(jogo => jogo.status !== 'finished')
        totalJogos = futuros.length
        proximo = futuros[0] || null

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
        }
      }

      if (!signal.aborted) {
        setResumo({
          posicao: indice >= 0 ? indice + 1 : null,
          pontos: meusDados ? Number(meusDados.pontos) : null,
          proximo,
          porFazer,
          totalJogos,
        })
      }
    } catch (error) {
      if (!signal.aborted) setErroResumo(error?.message || 'Não foi possível carregar o resumo.')
    } finally {
      if (!signal.aborted) setACarregarResumo(false)
    }
  }, [competicaoId])

  useEffect(() => {
    if (pagina !== 'inicio') return
    const controller = new AbortController()
    carregarResumo(controller.signal)
    return () => controller.abort()
  }, [pagina, atualizacao, carregarResumo])

  const componentes = {
    prognosticos: <JogosParticipante />,
    liga: <Liga competicaoId={competicaoId} />,
    estatisticas: <Estatisticas competicaoId={competicaoId} />,
    'hall-da-fama': <HallDaFama />,
    chat: <Chat />,
     }
  const secaoAtual = secoes.find(s => s.id === pagina)
  const proximo = resumo.proximo
  const proximoData = proximo ? new Date(proximo.kickoff).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null

  const indicadores = [
    { icone: '🏆', titulo: 'A minha posição', valor: resumo.posicao ? `${resumo.posicao}.º` : '—', detalhe: 'Classificação geral' },
    { icone: '⭐', titulo: 'Os meus pontos', valor: resumo.pontos ?? '—', detalhe: 'Época ativa' },
    { icone: '📅', titulo: 'Próximo jogo', valor: proximoData || 'Sem jogos', detalhe: proximo ? `${proximo.home_team} vs ${proximo.away_team}` : 'Nenhum jogo futuro agendado' },
    { icone: '🎯', titulo: 'Por apostar', valor: resumo.porFazer ?? '—', detalhe: `De ${resumo.totalJogos} jogos futuros` },
  ]

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
          <button type="button" className="pl-back" onClick={() => setPagina('inicio')}>← Dashboard</button>
        )}
      </header>

      {pagina === 'inicio' ? (
        <>
          <section className="pl-hero">
            <div className="pl-hero-content">
              <span className="pl-eyebrow">Área do Participante</span>
              <h2>🏆 Bem-vindo à competição!</h2>
              <p>Faz os teus prognósticos, acompanha a classificação e disputa o primeiro lugar com os restantes participantes.</p>
              <button type="button" className="pl-gold-button" onClick={() => setPagina('prognosticos')}>🎯 Fazer prognósticos</button>
            </div>
          </section>

          <div className="pl-section-heading">
            <h2 className="pl-section-title">O meu resumo</h2>
            <button type="button" className="pl-refresh" disabled={aCarregarResumo} onClick={() => setAtualizacao(n => n + 1)}>↻ Atualizar</button>
          </div>
          {erroResumo && <p className="pl-info pl-info-error" role="alert">Não foi possível atualizar os indicadores: {erroResumo}</p>}
          <div className="pl-stats" aria-busy={aCarregarResumo}>
            {indicadores.map(indicador => (
              <div className="pl-stat" key={indicador.titulo}>
                <span className="pl-stat-icon" aria-hidden="true">{indicador.icone}</span>
                <span className="pl-stat-label">{indicador.titulo}</span>
                <strong className="pl-stat-value">{aCarregarResumo ? '…' : erroResumo ? '—' : indicador.valor}</strong>
                <span className="pl-stat-detail">{aCarregarResumo ? 'A carregar...' : erroResumo ? 'Tenta atualizar' : indicador.detalhe}</span>
              </div>
            ))}
          </div>

          <div className="pl-section-heading"><h2 className="pl-section-title">Explorar a competição</h2></div>
          <div className="pl-grid">
            {secoes.map(secao => (
              <button type="button" key={secao.id} className="pl-card" onClick={() => setPagina(secao.id)}>
                <span className="pl-card-icon" aria-hidden="true">{secao.icone}</span>
                <h3>{secao.nome}</h3>
                <p>{secao.descricao}</p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <main className="pl-content">
          <h2 style={{ color: '#e8c76a', marginTop: 0, marginBottom: '22px' }}>
            {secaoAtual?.icone} {secaoAtual?.nome}
          </h2>
          {competicaoId
  ? componentes[pagina]
  : <p>A aguardar uma competição ativa...</p>}
               </main>
      )}
    </div>
  )
}

export default PainelParticipante