
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'
import PainelParticipante from './PainelParticipante'
function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [aEntrar, setAEntrar] = useState(false)
const [modoRegisto, setModoRegisto] = useState(false)
const [nomeParticipante, setNomeParticipante] = useState('')
const [administrador, setAdministrador] = useState(false)
const [participante, setParticipante] = useState(false)
useEffect(() => {
    async function verificarSessao() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data: perfil, error } = await supabase
        .from('profiles')
        .select('role, approval_status')
        .eq('id', user.id)
        .single()

     if (!error && perfil?.approval_status === 'approved') {
  if (perfil.role === 'admin') {
    setAdministrador(true)
  } else if (perfil.role === 'participant') {
    setParticipante(true)
  }
}
    }

    verificarSessao()
  }, [])

  async function registar(evento) {
    evento.preventDefault()
    setMensagem('')
    setAEntrar(true)

    if (!nomeParticipante.trim()) {
      setMensagem('Introduz o teu nome.')
      setAEntrar(false)
      return
    }

    if (password.length < 6) {
      setMensagem('A palavra-passe deve ter pelo menos 6 caracteres.')
      setAEntrar(false)
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

    setAEntrar(false)
  }

  async function entrar(evento) {
    evento.preventDefault()
    setMensagem('')
    setAEntrar(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMensagem('Não foi possível entrar. Confirma os teus dados.')
   
} else {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfil, error: erroPerfil } = await supabase
    .from('profiles')
    .select('role, approval_status')
    .eq('id', user.id)
    .single()

  if (erroPerfil) {
    setMensagem('Erro ao consultar o perfil: ' + erroPerfil.message)
  } else if (
    perfil.role === 'admin' &&
    perfil.approval_status === 'approved'
   ) {
    setMensagem('Administrador confirmado! ⚽')
    setAdministrador(true)
 } else if (
  perfil?.role === 'participant' &&
  perfil?.approval_status === 'approved'
) {
  setMensagem('Participante confirmado! ⚽')
  setAdministrador(false)
  setParticipante(true)
} else {
  setMensagem('A tua conta ainda aguarda aprovação.')
  setAdministrador(false)
  setParticipante(false)
}
}


    setAEntrar(false)
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
if (administrador || participante) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1220',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '15px 25px',
        background: '#172235',
      }}>
        <button
          onClick={terminarSessao}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🚪 Terminar sessão
        </button>
      </div>

      {administrador
        ? <Dashboard />
        : <PainelParticipante />}
    </div>
  )
}
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1220',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <form onSubmit={modoRegisto ? registar : entrar} style={{
        background: '#172235',
        padding: '35px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '360px',
        boxSizing: 'border-box'
      }}>
        <h1 style={{ color: '#22c55e', textAlign: 'center' }}>
          ⚽ Predict League
        </h1>

        <p style={{ textAlign: 'center' }}>
  {modoRegisto ? 'Criar conta na Predict League' : 'Iniciar sessão'}
</p>
        {modoRegisto && (
          <input
            type="text"
            placeholder="Nome do participante"
            value={nomeParticipante}
            onChange={(e) => setNomeParticipante(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '12px',
              boxSizing: 'border-box'
            }}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '12px',
            boxSizing: 'border-box'
          }}
        />

        <input
          type="password"
          placeholder="Palavra-passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '15px',
            boxSizing: 'border-box'
          }}
        />

        <button
          type="submit"
          disabled={aEntrar}
          style={{
            width: '100%',
            padding: '13px',
            background: '#22c55e',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
        {aEntrar
  ? 'A processar...'
  : modoRegisto
    ? 'Registar conta'
    : 'Entrar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setModoRegisto(!modoRegisto)
            setMensagem('')
          }}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '12px',
            background: 'transparent',
            color: '#22c55e',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {modoRegisto ? 'Voltar ao início de sessão' : 'Criar conta'}
        </button>

        {mensagem && (
          <p style={{ textAlign: 'center', marginTop: '18px' }}>
            {mensagem}
          </p>
        )}
      </form>
    </div>
  )
}

export default App
