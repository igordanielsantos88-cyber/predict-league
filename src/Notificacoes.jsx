import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import PushNotificacoes from './PushNotificacoes'
import PreferenciasPush from './PreferenciasPush'

const estilos = `
.pl-notificacoes { color:#e2e8f0; line-height:1.6; }
.pl-notificacoes * { box-sizing:border-box; }
.pl-notificacoes .pn-topo,.pl-notificacoes .pn-acoes { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
.pl-notificacoes .pn-topo { justify-content:space-between; }
.pl-notificacoes .pn-contador { padding:6px 12px; border:1px solid #8f722e; border-radius:20px; color:#f0d477; }
.pl-notificacoes button,.pl-notificacoes .pn-ligacao { padding:10px 14px; border:1px solid #594821; border-radius:9px; color:#e8c76a; background:#1b2535; cursor:pointer; font:inherit; }
.pl-notificacoes .pn-ligacao { text-decoration:none; }
.pl-notificacoes button:disabled { opacity:.55; cursor:wait; }
.pl-notificacoes button:focus-visible,.pl-notificacoes .pn-ligacao:focus-visible { outline:2px solid #f0d477; outline-offset:3px; }
.pl-notificacoes button[aria-pressed=true] { background:#d4af37; color:#211806; }
.pl-notificacoes .pn-nota { color:#a7b5c9; font-size:14px; }
.pl-notificacoes .pn-lista { list-style:none; padding:0; display:grid; gap:12px; }
.pl-notificacoes .pn-item.pn-grupo { padding:0; }
.pl-notificacoes .pn-grupo summary {
  padding:12px 16px; cursor:pointer; color:#e8c76a; overflow-wrap:anywhere;
}
.pl-notificacoes .pn-grupo summary:focus-visible { outline:2px solid #f0d477; outline-offset:2px; border-radius:10px; }
.pl-notificacoes .pn-grupo .pn-lista { margin:0 10px 10px; }
.pl-notificacoes .pn-grupo .pn-contagem { color:#a7b5c9; font-size:13px; margin-left:8px; }
.pl-notificacoes .pn-item { padding:20px; border:1px solid #354154; border-radius:14px; background:#101827; overflow-wrap:anywhere; }
.pl-notificacoes .pn-nova { border-left:4px solid #d4af37; }
.pl-notificacoes h3 { margin:0 0 8px; color:#e8c76a; font-size:17px; }
.pl-notificacoes .pn-item p { white-space:pre-wrap; margin:10px 0; }
.pl-notificacoes .pn-meta { color:#a7b5c9; font-size:13px; display:flex; flex-wrap:wrap; gap:12px; }
.pl-notificacoes .pn-item .pn-acoes { margin-top:10px; }
.pl-notificacoes .pn-erro { color:#fca5a5; }
.pl-notificacoes .pn-preferencias { margin-bottom:20px; }
.pl-notificacoes .pn-preferencias fieldset { border:0; padding:0; margin:0; }
.pl-notificacoes .pn-preferencias label { display:flex; align-items:center; gap:8px; margin:8px 0; }
.pl-notificacoes .pn-preferencias input { accent-color:#e8c76a; }
@media(max-width:600px) { .pl-notificacoes .pn-item { padding:14px; } }
`

function validarNotificacoes(data) {
  if (!Array.isArray(data) || data.length > 50 || new Set(data.map(n => n?.id)).size !== data.length ||
    !data.every(n => n && typeof n.id === 'string' && typeof n.titulo === 'string' &&
      typeof n.mensagem === 'string' && typeof n.tipo === 'string' && typeof n.lida === 'boolean' &&
      typeof n.criada_em === 'string' && Number.isFinite(Date.parse(n.criada_em)))) {
    throw new Error('A resposta das notificações não é válida. Tenta atualizar.')
  }
  return data
}

function categoria(tipo) {
  if (tipo === 'new_match') return 'Novo jogo'
  if (tipo === 'match_result') return 'Resultado'
  if (tipo === 'match_reminder' || tipo.startsWith('reminder_')) return 'Lembrete'
  return 'Aviso'
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function agruparPorJornada(avisos) {
  const entradas = new Map()
  for (const aviso of avisos) {
    const chave = aviso.jornadaNome ? aviso.jornadaId : aviso.id
    if (!entradas.has(chave)) entradas.set(chave, [])
    entradas.get(chave).push(aviso)
  }
  return [...entradas]
}

function Aviso({ aviso: n, aMarcar, carregando, marcar }) {
  return (
    <li className={`pn-item${n.lida ? '' : ' pn-nova'}`}>
      <h3>{n.titulo}</h3>
      <div className="pn-meta"><span>{categoria(n.tipo)}</span><span>{n.lida ? 'Lida' : 'Por ler'}</span>
        <time dateTime={n.criada_em}>{new Date(n.criada_em).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}</time>
      </div>
      <p>{n.mensagem}</p>
      {(!n.lida || n.jogoId) && <div className="pn-acoes">
        {n.jogoId && <a className="pn-ligacao" href={`/?jogo=${n.jogoId}`}>Ver jogo</a>}
        {n.tipo === 'match_result' && n.jornadaId && <a className="pn-ligacao" href={`/?jornada=${n.jornadaId}`}>Ver jornada</a>}
        {!n.lida && <button type="button" disabled={!!aMarcar || carregando} onClick={() => marcar('individual', n.id)}>
          {aMarcar === n.id ? 'A guardar…' : 'Marcar como lida'}
        </button>}
      </div>}
    </li>
  )
}

export default function Notificacoes({ atualizarSino, naoLidasTotal }) {
  const [estado, setEstado] = useState({ itens: null, erro: '', carregando: true })
  const [filtro, setFiltro] = useState('todas')
  const [preferenciasVisitadas, setPreferenciasVisitadas] = useState(false)
  const [aMarcar, setAMarcar] = useState(null)
  const [erroMarcacao, setErroMarcacao] = useState('')
  const [mensagemMarcacao, setMensagemMarcacao] = useState('')
  const [lote, setLote] = useState(null)
  const acoes = useRef(null)
  const atualizar = useCallback(() => acoes.current?.carregar(), [])
  const marcar = (acao, id) => acoes.current?.marcar(acao, id)

  useEffect(() => {
    if (!lote) return
    const limite = setTimeout(() => setLote(null), 60000)
    return () => clearTimeout(limite)
  }, [lote])

  useEffect(() => {
    let ativo = true
    let pedido = 0
    let controller = null
    let mutacao = false
    let operacao = 0
    let utilizador = null
    let itens = []
    let ultimaTentativa = 0

    async function carregar() {
      if (!ativo || mutacao) return
      const atual = ++pedido
      controller?.abort()
      controller = new AbortController()
      const signal = controller.signal
      ultimaTentativa = Date.now()
      setEstado({ itens, erro: '', carregando: true })
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!ativo || atual !== pedido) return
        if (error || !data?.user) throw new Error('Inicia sessão novamente para consultar as notificações.')
        utilizador = data.user.id
        const resultado = await supabase.rpc('obter_notificacoes').abortSignal(signal)
        if (!ativo || atual !== pedido) return
        if (resultado.error) throw new Error('Não foi possível carregar as notificações. Tenta novamente.')
        const avisos = validarNotificacoes(resultado.data)
        const ids = avisos.filter(aviso => uuid.test(aviso.id)).map(aviso => aviso.id)
        const ligacoes = new Map()
        if (ids.length) {
          const argumentos = { p_notificacao_ids: ids }
          let resposta = await supabase.rpc('obter_destinos_das_notificacoes', argumentos).abortSignal(signal)
          if (!signal.aborted && resposta.error?.code === 'PGRST202') {
            resposta = await supabase.rpc('obter_jogos_das_notificacoes', argumentos).abortSignal(signal)
          }
          if (!ativo || atual !== pedido) return
          if (Array.isArray(resposta.data)) {
            for (const jogo of resposta.data) {
              if (typeof jogo?.jogo_id === 'string' && uuid.test(jogo.jogo_id)) {
                ligacoes.set(jogo.notificacao_id, {
                  jogoId: jogo.jogo_id,
                  jornadaId: typeof jogo.jornada_id === 'string' && uuid.test(jogo.jornada_id) ? jogo.jornada_id : null,
                })
              }
            }
          }
        }
        const jogosIds = [...new Set([...ligacoes.values()].map(ligacao => ligacao.jogoId))]
        const jornadasPorJogo = new Map()
        if (jogosIds.length) {
          const { data } = await supabase.from('matches').select('id,jornada_id,jornadas(numero,nome)')
            .in('id', jogosIds).abortSignal(signal)
          if (!ativo || atual !== pedido) return
          for (const jogo of data || []) {
            const jornada = jogo.jornadas
            if (!uuid.test(jogo.jornada_id) || !jornada) continue
            const nome = jornada.nome || (jornada.numero != null ? `Jornada ${jornada.numero}` : null)
            if (nome) jornadasPorJogo.set(jogo.id, { jornadaId: jogo.jornada_id, jornadaNome: nome })
          }
        }
        itens = avisos.map(aviso => {
          const ligacao = ligacoes.get(aviso.id)
          return { ...aviso, ...ligacao, ...jornadasPorJogo.get(ligacao?.jogoId) }
        })
        setEstado({ itens, erro: '', carregando: false })
      } catch (error) {
        if (ativo && atual === pedido) {
          itens = []
          setEstado({ itens: null, erro: error.message || 'Não foi possível carregar as notificações.', carregando: false })
        }
      }
    }

    async function alterarLeitura(acao, id) {
      if (!ativo || mutacao || !utilizador) return
      if (acao === 'individual' && !itens.some(n => n.id === id && !n.lida)) return
      mutacao = true
      const operacaoAtual = ++operacao
      const atual = ++pedido
      const dono = utilizador
      controller?.abort()
      controller = new AbortController()
      const signal = controller.signal
      setAMarcar(acao === 'individual' ? id : acao)
      setErroMarcacao('')
      setMensagemMarcacao('')
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!ativo || atual !== pedido) return
        if (error || data?.user?.id !== dono) throw new Error('A sessão mudou. Atualiza as notificações antes de continuar.')
        const [rpc, argumentos] = acao === 'individual' ? ['marcar_notificacao_lida', { p_notificacao_id: id }]
          : acao === 'todas' ? ['marcar_todas_notificacoes_lidas', {}]
            : ['desfazer_notificacoes_lidas', { p_lote: id }]
        const resultado = await supabase.rpc(rpc, argumentos).abortSignal(signal)
        if (!ativo || atual !== pedido) return
        if (resultado.error) throw new Error('Não foi possível atualizar os avisos. Tenta novamente.')

        if (acao === 'todas') {
          const { total, lote: novoLote } = resultado.data ?? {}
          if (!Number.isSafeInteger(total) || typeof novoLote !== 'string' || !uuid.test(novoLote)) {
            throw new Error('Não foi possível confirmar a marcação dos avisos.')
          }
          if (total > 0) {
            setLote(novoLote)
            setMensagemMarcacao(total === 1 ? 'Um aviso marcado como lido.' : `${total} avisos marcados como lidos.`)
          } else {
            setMensagemMarcacao('Não havia avisos por ler.')
          }
        } else if (acao === 'desfazer') {
          const total = Number(resultado.data)
          if (resultado.data == null || !Number.isSafeInteger(total)) throw new Error('Não foi possível confirmar a alteração.')
          setLote(null)
          setMensagemMarcacao(total > 0 ? 'A marcação foi desfeita.' : 'O prazo para desfazer terminou.')
        } else {
          if (typeof resultado.data !== 'boolean') throw new Error('Não foi possível marcar o aviso como lido. Tenta novamente.')
          if (resultado.data) {
            itens = itens.map(n => n.id === id ? { ...n, lida: true } : n)
            setEstado({ itens, erro: '', carregando: false })
          }
        }
        atualizarSino()
        mutacao = false
        await carregar()
      } catch (error) {
        if (ativo && atual === pedido) setErroMarcacao(error.message || 'Não foi possível marcar o aviso como lido.')
      } finally {
        if (ativo && operacaoAtual === operacao) {
          mutacao = false
          setAMarcar(null)
        }
      }
    }

    function refrescarVisivel() {
      if (document.visibilityState !== 'hidden' && Date.now() - ultimaTentativa >= 5000) carregar()
    }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const novo = session?.user?.id ?? null
      if (novo === utilizador && _event !== 'SIGNED_OUT') return
      ++operacao
      ++pedido
      controller?.abort()
      utilizador = novo
      itens = []
      mutacao = false
      setAMarcar(null)
      setErroMarcacao('')
      setMensagemMarcacao('')
      setLote(null)
      setEstado({ itens: null, erro: '', carregando: true })
      // Não fazer chamadas Supabase dentro do callback de autenticação.
      queueMicrotask(() => { if (ativo) carregar() })
    })
    acoes.current = { carregar, marcar: alterarLeitura }
    carregar()
    const timer = window.setInterval(refrescarVisivel, 60000)
    window.addEventListener('focus', refrescarVisivel)
    document.addEventListener('visibilitychange', refrescarVisivel)
    return () => {
      ativo = false
      ++pedido
      controller?.abort()
      acoes.current = null
      window.clearInterval(timer)
      window.removeEventListener('focus', refrescarVisivel)
      document.removeEventListener('visibilitychange', refrescarVisivel)
      listener?.subscription?.unsubscribe()
    }
  }, [atualizarSino])

  const naoLidas = estado.itens?.filter(n => !n.lida).length
  const visiveis = estado.itens?.filter(n => filtro === 'todas' || !n.lida) ?? []
  const grupos = agruparPorJornada(visiveis)
  const renderAviso = aviso => <Aviso key={aviso.id} aviso={aviso} aMarcar={aMarcar}
    carregando={estado.carregando} marcar={marcar} />
  return <section className="pl-notificacoes pl-secao" aria-label="As minhas notificações" aria-busy={estado.carregando}>
    <style>{estilos}</style>
    <div className="pn-topo">
      <span className="pn-contador">{naoLidas == null ? '—' : naoLidas} por ler nos últimos 50 avisos</span>
      <button type="button" disabled={estado.carregando || !!aMarcar} onClick={atualizar}>Atualizar</button>
    </div>
    <p className="pn-nota">Avisos pessoais da tua conta, incluindo épocas de teste. Mostramos até 50 avisos. Cada grupo fica na posição do seu aviso mais recente.</p>
    <div className="pn-acoes">
      <button type="button" aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas</button>
      <button type="button" aria-pressed={filtro === 'nao-lidas'} onClick={() => setFiltro('nao-lidas')}>Por ler</button>
    </div>
    <div className="pn-acoes">
      <button type="button" disabled={estado.carregando || !!aMarcar || !(naoLidasTotal ?? naoLidas)}
        onClick={() => marcar('todas')}>Marcar todos como lidos</button>
      {lote && <button type="button" disabled={!!aMarcar} onClick={() => marcar('desfazer', lote)}>Desfazer</button>}
    </div>
    {mensagemMarcacao && <p role="status">{mensagemMarcacao}</p>}
    {estado.carregando && <p role="status">A carregar notificações…</p>}
    {estado.erro && <p role="alert" className="pn-erro">{estado.erro}</p>}
    {erroMarcacao && <p role="alert" className="pn-erro">{erroMarcacao}</p>}
    {estado.itens && !estado.carregando && !visiveis.length && <p>{filtro === 'nao-lidas' ? 'Não tens avisos por ler entre os últimos 50.' : 'Ainda não tens notificações.'}</p>}
    <ul className="pn-lista">{grupos.map(([id, avisos]) => {
      if (avisos.length === 1) return renderAviso(avisos[0])
      const porLer = avisos.filter(aviso => !aviso.lida).length
      const soResultados = avisos.every(aviso => aviso.tipo === 'match_result') &&
        new Set(avisos.map(aviso => aviso.jogoId)).size === avisos.length
      return (
        <li key={id}>
          <details className={`pn-item pn-grupo${porLer ? ' pn-nova' : ''}`}>
            <summary>
              <strong>{avisos.length} {soResultados ? 'resultados' : 'avisos'} · {avisos[0].jornadaNome}</strong>
              {porLer > 0 && <span className="pn-contagem">{porLer} por ler</span>}
            </summary>
            <ul className="pn-lista">{avisos.map(renderAviso)}</ul>
          </details>
        </li>
      )
    })}</ul>
    <p className="pn-nota">Esta lista atualiza a cada minuto enquanto está aberta e visível. Os avisos refletem o momento em que foram criados; consulta os jogos para veres os dados atuais.</p>
    <details className="pn-item pn-grupo" onToggle={evento => {
      if (evento.currentTarget.open) setPreferenciasVisitadas(true)
    }}>
      <summary>Preferências de notificações</summary>
      {preferenciasVisitadas && <div className="pn-lista">
        <PushNotificacoes />
        <PreferenciasPush />
      </div>}
    </details>
  </section>
}
