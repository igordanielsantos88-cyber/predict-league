
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'
import PainelParticipante from './PainelParticipante'
import Notificacoes from './Notificacoes'

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

  async function terminarSessao() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('Erro ao terminar sessão: ' + error.message)
      return
    }

    setAdministrador(false)
    setParticipante(false)
    setEmail('')
    setPassword('')
    setMensagem('')
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
            <Notificacoes />

            <button
              type="button"
              className="pl-logout"
              onClick={terminarSessao}
            >
              Sair
            </button>
          </div>
        </header>

        {administrador
          ? <Dashboard />
          : <PainelParticipante />}
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
