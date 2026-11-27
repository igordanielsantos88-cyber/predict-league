import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'
import PainelParticipante from './PainelParticipante'
import { prepararSaidaPush, concluirSaidaPush, vigiarSessaoPush } from './push'


const cores = {
  fundo: '#090d16',
  cartao: '#172235',
  dourado: '#e8c76a',
  borda: '#8f722e',
  texto: '#f8fafc',
  secundario: '#94a3b8',
}

const estilos = `
  .pl-app {
    min-height: 100vh;
    background: ${cores.fundo};
    color: ${cores.texto};
    font-family: Arial, sans-serif;
  }

  .pl-app * {
    box-sizing: border-box;
  }

  .pl-topbar {
    position: relative;
    z-index: 20;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 14px 28px;
    background: #111827;
    border-bottom: 1px solid #594821;
  }

  .pl-topbar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: ${cores.dourado};
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .pl-topbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pl-logout {
    background: #1b2535;
    color: ${cores.dourado};
    border: 1px solid ${cores.borda};
    border-radius: 10px;
    padding: 10px 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background .2s, border-color .2s;
  }

  .pl-logout:focus-visible {
    outline: 2px solid #f0d477;
    outline-offset: 3px;
  }

  .pl-sino {
    position: relative;
  }

  .pl-sino-contador {
    position: absolute;
    top: -7px;
    right: -8px;
    min-width: 20px;
    padding: 2px 5px;
    border-radius: 20px;
    background: #f0d477;
    color: #211806;
    font-size: 11px;
    text-align: center;
  }

  .pl-logout:hover {
    background: #302718;
    border-color: #d4af37;
  }

  .pl-login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background:
      radial-gradient(ellipse at 50% 20%, #302718, transparent 55%),
      #090d16;
  }

  .pl-login-card {
    width: 100%;
    max-width: 410px;
    padding: 36px;
    background: linear-gradient(145deg, #1b2535, #111722);
    border: 1px solid #8f722e;
    border-radius: 22px;
    box-shadow: 0 20px 60px #00000050;
  }

  .pl-login-icon {
    width: 66px;
    height: 66px;
    display: grid;
    place-items: center;
    margin: 0 auto 18px;
    background: linear-gradient(135deg, #f0d477, #a67c25);
    border-radius: 18px;
    font-size: 34px;
  }

  .pl-login-title {
    margin: 0;
    text-align: center;
    color: ${cores.dourado};
    font-size: 28px;
  }

  .pl-login-subtitle {
    color: ${cores.secundario};
    text-align: center;
    margin: 12px 0 28px;
    font-size: 14px;
  }

  .pl-login-label {
    display: block;
    margin-bottom: 8px;
    color: #cbd5e1;
    font-size: 13px;
    font-weight: bold;
  }

  .pl-login-input {
    display: block;
    width: 100%;
    padding: 13px 14px;
    margin-bottom: 18px;
    background: #0d1523;
    color: white;
    border: 1px solid #3d4655;
    border-radius: 10px;
    font-size: 15px;
    outline: none;
  }

  .pl-login-input:focus {
    border-color: #d4af37;
    box-shadow: 0 0 0 3px #d4af3720;
  }

  .pl-login-submit {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #f0d477, #c69c32);
    color: #211806;
    border: none;
    border-radius: 10px;
    font-weight: bold;
    font-size: 15px;
    cursor: pointer;
  }

  .pl-login-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .pl-login-switch {
    width: 100%;
    padding: 13px;
    margin-top: 12px;
    background: transparent;
    color: ${cores.dourado};
    border: 1px solid ${cores.borda};
    border-radius: 10px;
    cursor: pointer;
    font-weight: bold;
  }

  .pl-login-message {
    margin-top: 20px;
    padding: 12px;
    background: #29384d;
    border-radius: 9px;
    text-align: center;
    color: #f8fafc;
    font-size: 13px;
    line-height: 1.5;
  }

  @media (max-width: 600px) {
    .pl-topbar {
      padding: 12px 16px;
    }

    .pl-topbar-brand {
      font-size: 12px;
    }

    .pl-topbar-actions {
      gap: 8px;
    }

    .pl-login-card {
      padding: 25px 20px;
    }
  }
`

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
        <style>{estilos}</style>
        <div className="pl-login-page">
          <p style={{ color: cores.dourado }}>
            A carregar Predict League...
          </p>
        </div>
      </div>
    )
  }

  if (administrador || participante) {
    return (
      <div className="pl-app">
        <style>{estilos}</style>

        <header className="pl-topbar">
          <div className="pl-topbar-brand">
            <span>⚽</span>
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
              <span aria-hidden="true">🔔</span>
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
          ? <Dashboard pedidoNotificacoes={pedidoNotificacoes} atualizarSino={atualizarSino} destino={destino} limparLigacao={limparLigacao} />
          : <PainelParticipante pedidoNotificacoes={pedidoNotificacoes} atualizarSino={atualizarSino} destino={destino} limparLigacao={limparLigacao} />}
      </div>
    )
  }

  return (
    <div className="pl-app">
      <style>{estilos}</style>

      <div className="pl-login-page">
        <form
          className="pl-login-card"
          onSubmit={modoRegisto ? registar : entrar}
        >
          <div className="pl-login-icon">
            ⚽
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
