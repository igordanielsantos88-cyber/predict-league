import { lazy, useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import SecaoCarregavel from './SecaoCarregavel'
import InicioPainel from './InicioPainel'
import { obterResumoInicio } from './resumoInicio'
import { BarraPainel, SecoesPainel } from './NavegacaoPainel'
import IconePainel from './IconePainel'
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
  { id: 'competicoes', nome: 'Gerir Competições', descricao: 'Cria e gere as competições' },
  { id: 'prognosticos', nome: 'Prognósticos', descricao: 'Consulta os jogos e faz os teus palpites' },
  { id: 'liga', nome: 'Classificação', descricao: 'Acompanha a tabela da competição' },
  { id: 'jornadas', nome: 'Jornadas', descricao: 'Gere as jornadas e os jogos' },
  { id: 'participantes', nome: 'Participantes', descricao: 'Consulta e aprova participantes' },
  { id: 'notificacoes', nome: 'Notificações', descricao: 'Consulta os teus avisos de jogos, resultados e lembretes' },
  { id: 'diagnostico-push', nome: 'Diagnóstico de push', descricao: 'Acompanha a fila e as falhas dos avisos push' },
  { id: 'conquistas', nome: 'Conquistas', descricao: 'Descobre as tuas medalhas e acompanha o teu progresso' },
  { id: 'duelo', nome: 'Duelo', descricao: 'Compara o teu desempenho com outro participante' },
  { id: 'estatisticas', nome: 'Estatísticas', descricao: 'Consulta os números da competição' },
  { id: 'hall-da-fama', nome: 'Hall da Fama', descricao: 'Consulta os campeões das épocas anteriores' },
  { id: 'chat', nome: 'Chat', descricao: 'Conversa com os participantes' },
]


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
  const [alvoDoPainel, setAlvoDoPainel] = useState(null)
  const [erroCompeticao, setErroCompeticao] = useState('')
  const [aCarregarCompeticao, setACarregarCompeticao] = useState(true)
  const [resumo, setResumo] = useState({ posicao: null, pontos: null, proximos: [], porFazer: null })
  const [aCarregarResumo, setACarregarResumo] = useState(true)
  const [erroResumo, setErroResumo] = useState('')
  const [atualizacao, setAtualizacao] = useState(0)
  const atualizarInicio = useCallback(() => setAtualizacao(n => n + 1), [])

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

  const carregarResumo = useCallback(async signal => {
    if (!competicaoId) return
    setACarregarResumo(true)
    setErroResumo('')
    try {
      const dados = await obterResumoInicio(competicaoId, signal)
      if (!signal.aborted) setResumo(dados)
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
    'proximo-jogo': <JogosParticipante competicaoId={competicaoId} jogoDaLigacao={alvoDoPainel} />,
    liga: <Liga competicaoId={competicaoId} jornadaInicial={destino?.tipo === 'jornada' ? destino.id : alvoDoPainel} />,
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
  function abrir(secao, alvoId = null) {
    limparLigacao()
    setAlvoDoPainel(alvoId)
    setPagina(secao)
    window.scrollTo(0, 0)
  }

  const estaDisponivel = secao => Boolean(competicaoId) ||
    ['competicoes', 'diagnostico-push', 'notificacoes'].includes(secao)

  return (
    <div className="pl-dashboard">
      {pagina !== 'inicio' && <header className="pl-header">
        <div className="pl-logo">
          <div>
            <h1>A tua liga</h1>
            <p className="pl-subtitle">Predict League · A tua competição</p>
          </div>
        </div>
        {pagina !== 'inicio' && (
          <button type="button" className="pl-back" onClick={() => abrir('inicio')}><IconePainel nome="voltar" tamanho={18} /> Início</button>
        )}
      </header>}

      {erroCompeticao && <p className="pl-info pl-info-error" role="alert">{erroCompeticao}</p>}
      {aCarregarCompeticao && <p className="pl-info">A identificar a competição ativa...</p>}

      {pagina === 'inicio' ? (
        <>
          <InicioPainel resumo={resumo} aCarregar={aCarregarCompeticao || (Boolean(competicaoId) && aCarregarResumo)}
            erro={erroResumo} competicaoId={competicaoId} abrir={abrir} atualizacao={atualizacao} atualizar={atualizarInicio} />
          <SecoesPainel secoes={secoes} abrir={abrir} estaDisponivel={estaDisponivel} />
        </>
      ) : pagina === 'mais' ? (
        <SecoesPainel secoes={secoes} abrir={abrir} estaDisponivel={estaDisponivel} outras />
      ) : (
        <main className={`pl-content${secaoAtual?.id === 'prognosticos' ? ' pl-content-jogos' : ''}`}>
          {pagina !== 'liga' && pagina !== 'estatisticas' && secaoAtual?.id !== 'prognosticos' && <h2 className="pl-content-title">
            <IconePainel nome={secaoAtual?.id} tamanho={24} /> {secaoAtual?.nome}
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
