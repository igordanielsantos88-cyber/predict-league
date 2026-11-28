import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'
import PainelParticipante from './PainelParticipante'
import { prepararSaidaPush, concluirSaidaPush, vigiarSessaoPush } from './push'
import IconePainel, { MarcaPredictLeague } from './IconePainel'
import './App.css'



function App() {
  const [aSair, setASair] = useState(false)
  const [erroSaida, setErroSaida] = useState('')
  const saidaEmCurso = useRef(false)
  useEffect(() => vigiarSessaoPush(setErroSaida), [])
  const [pedidoNotificacoes, setPedidoNotificacoes] = useState(0)
  const [naoLidas, setNaoLidas] = useState(null)
  const [revisaoNotificacoes, setRevisaoNotificacoes] = useState(0)
  const atualizarSino = useCallback(() => setRevisaoNotificacoes(revisao => revisao + 1), [])
  const [destino, setDestino] = useState(() => {
    const parametros = new URLSearchParams(window.location.search)
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    for (const tipo of ['jogo', 'jornada']) {
      const id = parametros.get(tipo)
      if (id?.length === 36 && uuid.test(id)) return { tipo, id: id.toLowerCase() }
    }
    return null
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [aEntrar, setAEntrar] = useState(false)
  const [modoRegisto, setModoRegisto] = useState(false)
  const [nomeParticipante, setNomeParticipante] = useState('')
  const [administrador, setAdministrador] = useState(false)
  const [participante, setParticipante] = useState(false)
  const [aVerificarSessao, setAVerificarSessao] = useState(true)

  useEffect(() => {
    if (!administrador && !participante) return
    let controller

    async function consultar() {
      if (document.visibilityState === 'hidden') return
      controller?.abort()
      const pedido = new AbortController()
      controller = pedido
      const { data, error } = await supabase.rpc('contar_notificacoes_nao_lidas').abortSignal(pedido.signal)
      if (pedido.signal.aborted) return
      const total = Number(data)
      if (!error && data != null && Number.isSafeInteger(total) && total >= 0) setNaoLidas(total)
    }

    void consultar()
    const intervalo = setInterval(consultar, 60000)
    window.addEventListener('focus', consultar)
    document.addEventListener('visibilitychange', consultar)
    const { data: sessao } = supabase.auth.onAuthStateChange(event => {
      if (event !== 'SIGNED_OUT') return
      controller?.abort()
      setNaoLidas(null)
    })
    return () => {
      controller?.abort()
      clearInterval(intervalo)
      window.removeEventListener('focus', consultar)
      document.removeEventListener('visibilitychange', consultar)
      sessao.subscription.unsubscribe()
    }
  }, [administrador, participante, revisaoNotificacoes])

  useEffect(() => {
    let ativo = true

    async function verificarSessao() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !ativo) return

        const { data: perfil, error } = await supabase
          .from('profiles')
          .select('role, approval_status')
          .eq('id', user.id)
          .single()

        if (!ativo || error) return

        if (perfil?.approval_status === 'approved') {
          setAdministrador(perfil.role === 'admin')
          setParticipante(perfil.role === 'participant')
        }
      } finally {
        if (ativo) setAVerificarSessao(false)
      }
    }

    verificarSessao()

    return () => {
      ativo = false
    }
  }, [])

  async function registar(evento) {
    evento.preventDefault()
    setMensagem('')
    setAEntrar(true)

    try {
      if (!nomeParticipante.trim()) {
        setMensagem('Introduz o teu nome.')
        return
      }

      if (password.length < 6) {
        setMensagem(
          'A palavra-passe deve ter pelo menos 6 caracteres.'
        )
        return
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: nomeParticipante.trim(),
          },
        },
      })

      if (error) {
        setMensagem('Erro no registo: ' + error.message)
      } else {
        setMensagem(
          'Conta criada! Aguarda a aprovação do administrador.'
        )
        setNomeParticipante('')
        setEmail('')
        setPassword('')
        setModoRegisto(false)
      }
    } catch {
      setMensagem('Ocorreu um erro ao criar a conta.')
    } finally {
      setAEntrar(false)
    }
  }

  async function entrar(evento) {
    evento.preventDefault()
    setMensagem('')
    setAEntrar(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setMensagem(
          'Não foi possível entrar. Confirma os teus dados.'
        )
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setMensagem('Não foi possível confirmar a sessão.')
        return
      }

      const { data: perfil, error: erroPerfil } = await supabase
        .from('profiles')
        .select('role, approval_status')
        .eq('id', user.id)
        .single()

      if (erroPerfil) {
        setMensagem(
          'Erro ao consultar o perfil: ' + erroPerfil.message
        )
      } else if (
        perfil?.role === 'admin' &&
        perfil?.approval_status === 'approved'
      ) {
        setAdministrador(true)
        setParticipante(false)
      } else if (
        perfil?.role === 'participant' &&
        perfil?.approval_status === 'approved'
      ) {
        setAdministrador(false)
        setParticipante(true)
      } else {
        setMensagem('A tua conta ainda aguarda aprovação.')
        setAdministrador(false)
        setParticipante(false)
      }
    } catch {
      setMensagem('Ocorreu um erro ao iniciar sessão.')
    } finally {
      setAEntrar(false)
    }
  }

  function limparLigacao() {
    if (!destino) return
    const url = new URL(window.location.href)
    url.searchParams.delete('jogo')
    url.searchParams.delete('jornada')
    window.history.replaceState(window.history.state, '', url)
    setDestino(null)
  }

  async function terminarSessao() {
    if (saidaEmCurso.current) return
    saidaEmCurso.current = true
    setASair(true)
    setErroSaida('')
    try {
      await prepararSaidaPush()
      const { error } = await supabase.auth.signOut()
      if (error) throw new Error('Não foi possível terminar a sessão. Tenta novamente.')
      setAdministrador(false)
      setParticipante(false)
      setEmail('')
      setPassword('')
      setMensagem('')
      setPedidoNotificacoes(0)
      setNaoLidas(null)
      limparLigacao()
    } catch (error) {
      setErroSaida(error.message || 'Não foi possível terminar a sessão.')
    } finally {
      concluirSaidaPush()
      saidaEmCurso.current = false
      setASair(false)
    }
  }

  if (aVerificarSessao) {
    return (
      <div className="pl-app">
        <div className="pl-login-page">
          <p style={{ color: 'var(--pl-ouro)' }}>
            A carregar Predict League...
          </p>
        </div>
      </div>
    )
  }

  if (administrador || participante) {
    return (
      <div className="pl-app">

        <header className="pl-topbar">
          <div className="pl-topbar-brand">
            <MarcaPredictLeague />
            <span>PREDICT LEAGUE</span>
          </div>

          <div className="pl-topbar-actions">
            <button
              type="button"
              className="pl-logout pl-sino"
              aria-label={naoLidas > 0
                ? `Abrir notificações (${naoLidas} ${naoLidas === 1 ? 'aviso por ler' : 'avisos por ler'})`
                : 'Abrir notificações'}
              title="Notificações"
              onClick={() => {
                limparLigacao()
                setPedidoNotificacoes(n => n + 1)
              }}
            >
              <IconePainel nome="notificacoes" />
              {naoLidas > 0 && <span className="pl-sino-contador" aria-hidden="true">{naoLidas > 99 ? '99+' : naoLidas}</span>}
            </button>

            <button
              type="button"
              className="pl-logout"
              disabled={aSair}
              onClick={terminarSessao}
            >
              {aSair ? 'A sair…' : 'Sair'}
            </button>
          </div>
        </header>
        {erroSaida && <p role="alert" style={{ padding: '12px 28px', color: '#fca5a5' }}>{erroSaida}</p>}

        {administrador
          ? <Dashboard pedidoNotificacoes={pedidoNotificacoes} atualizarSino={atualizarSino} naoLidasTotal={naoLidas} destino={destino} limparLigacao={limparLigacao} />
          : <PainelParticipante pedidoNotificacoes={pedidoNotificacoes} atualizarSino={atualizarSino} naoLidasTotal={naoLidas} destino={destino} limparLigacao={limparLigacao} />}
      </div>
    )
  }

  return (
    <div className="pl-app">

      <div className="pl-login-page">
        <form
          className="pl-login-card"
          onSubmit={modoRegisto ? registar : entrar}
        >
          <div className="pl-login-icon">
            <MarcaPredictLeague />
          </div>

          <h1 className="pl-login-title">
            Predict League
          </h1>

          <p className="pl-login-subtitle">
            {modoRegisto
              ? 'Cria a tua conta e entra na competição'
              : 'Entra na tua liga de prognósticos'}
          </p>

          {modoRegisto && (
            <>
              <label
                className="pl-login-label"
                htmlFor="pl-nome"
              >
                Nome do participante
              </label>

              <input
                id="pl-nome"
                className="pl-login-input"
                type="text"
                placeholder="O teu nome"
                value={nomeParticipante}
                onChange={e => setNomeParticipante(e.target.value)}
                required
              />
            </>
          )}

          <label
            className="pl-login-label"
            htmlFor="pl-email"
          >
            Email
          </label>

          <input
            id="pl-email"
            className="pl-login-input"
            type="email"
            placeholder="O teu email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <label
            className="pl-login-label"
            htmlFor="pl-password"
          >
            Palavra-passe
          </label>

          <input
            id="pl-password"
            className="pl-login-input"
            type="password"
            placeholder="A tua palavra-passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="pl-login-submit"
            disabled={aEntrar}
          >
            {aEntrar
              ? 'A processar...'
              : modoRegisto
                ? 'Registar conta'
                : 'Entrar'}
          </button>

          <button
            type="button"
            className="pl-login-switch"
            onClick={() => {
              setModoRegisto(!modoRegisto)
              setMensagem('')
            }}
          >
            {modoRegisto
              ? 'Voltar ao início de sessão'
              : 'Criar conta'}
          </button>

          {mensagem && (
            <p className="pl-login-message" role="status">
              {mensagem}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default App
