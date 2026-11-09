import JogosParticipante from './JogosParticipante'
import { useState } from 'react'
import Liga from './Liga'
import Participantes from './Participantes'
import Jornadas from './Jornadas'

function Dashboard() {
  const [pagina, setPagina] = useState('inicio')

  const cartao = {
    background: '#172235',
    padding: '22px',
    borderRadius: '14px',
    border: '1px solid #29384d',
  }

  if (pagina === 'participantes') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0b1220',
        color: 'white',
        padding: '25px',
      }}>
        <button onClick={() => setPagina('inicio')}>
          ← Voltar ao Dashboard
        </button>
        <Participantes />
      </div>
    )
  }

  if (pagina === 'jornadas') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0b1220',
        color: 'white',
        padding: '25px',
      }}>
        <button onClick={() => setPagina('inicio')}>
          ← Voltar ao Dashboard
        </button>
        <Jornadas />
      </div>
    )
  }
if (pagina === 'prognosticos') {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1220',
      color: 'white',
      padding: '25px',
    }}>
      <button onClick={() => setPagina('inicio')}>
        ← Voltar ao Dashboard
      </button>

      <JogosParticipante />
    </div>
  )
}
  if (pagina === 'liga') {
    return (
      <div>
        <button onClick={() => setPagina('inicio')}>
          ← Voltar ao Dashboard
        </button>
        <Liga />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1220',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      padding: '30px 20px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        <h1 style={{ color: '#22c55e' }}>
          ⚽ Predict League
        </h1>

        <p style={{ color: '#94a3b8' }}>
          O teu painel principal
        </p>

        <h2>🏠 Dashboard</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginTop: '24px',
        }}>

          <div
            style={{ ...cartao, cursor: 'pointer' }}
            onClick={() => setPagina('liga')}
          >
            <h3>🏆 Liga</h3>
            <p>Consulta a classificação</p>
          </div>

         <div
  style={{ ...cartao, cursor: 'pointer' }}
  onClick={() => setPagina('prognosticos')}
>
            <h3>🎯 Jogos</h3>
            <p>Faz os teus palpites</p>
          </div>

          <div style={cartao}>
            <h3>⭐ Jogos Bónus</h3>
            <p>Dois jogos especiais por jornada</p>
          </div>

          <div style={cartao}>
            <h3>📊 Estatísticas</h3>
            <p>Acompanha o teu desempenho</p>
          </div>

          <div
            style={{ ...cartao, cursor: 'pointer' }}
            onClick={() => setPagina('jornadas')}
          >
            <h3>📅 Gerir Jornadas</h3>
            <p>Criar jornadas e organizar os jogos</p>
          </div>

          <div
            style={{ ...cartao, cursor: 'pointer' }}
            onClick={() => setPagina('participantes')}
          >
            <h3>👥 Gerir Participantes</h3>
            <p>Aprovar e consultar participantes</p>
          </div>

        </div>

        <p style={{
          marginTop: '35px',
          color: '#94a3b8',
        }}>
          Bem-vindo à tua competição privada!
        </p>

      </div>
    </div>
  )
}

export default Dashboard
