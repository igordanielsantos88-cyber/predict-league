import JogosParticipante from './JogosParticipante'
import { useState } from 'react'
import Liga from './Liga'
import Participantes from './Participantes'
import Jornadas from './Jornadas'

import HallDaFama from './HallDaFama'

import Estatisticas from './Estatisticas'

function Dashboard() {
  const [pagina, setPagina] = useState('inicio')

if (pagina === 'hall-da-fama') {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1220',
      padding: '20px'
    }}>
      <button
        onClick={() => setPagina('inicio')}
        style={{
          background: '#172235',
          color: 'white',
          padding: '12px 18px',
          border: '1px solid #29384d',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        ← Voltar ao Dashboard
      </button>

      <HallDaFama />
    </div>
  )
}

 
 const cartao = {
  background: 'linear-gradient(145deg, #1c1c24, #111118)',
  color: '#f8fafc',
  padding: '24px',
  borderRadius: '16px',
  border: '1px solid #8b733a',
  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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

if (pagina === 'estatisticas') {
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

      <Estatisticas />
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
       
<h1 style={{ color: '#c9a84c' }}>
  ⚽ Predict League
</h1>


        <p style={{ color: '#94a3b8' }}>
          O teu painel principal
        </p>

        <h2>🏠 Dashboard</h2>

<div style={{
  background: 'linear-gradient(135deg, #1c1c24, #302718)',
  border: '1px solid #c9a84c',
  borderRadius: '16px',
  padding: '25px',
  marginTop: '20px',
  marginBottom: '25px',
}}>
  <p style={{
    color: '#22c55e',
    fontWeight: 'bold',
    margin: 0,
  }}>
    ⚽ A TUA COMPETIÇÃO
  </p>

  <h2 style={{
    color: 'white',
    margin: '12px 0',
    fontSize: '28px',
  }}>
    Predict League
  </h2>

  <p style={{
    color: '#cbd5e1',
    marginBottom: '20px',
  }}>
    Mostra o que sabes de futebol. Compete, soma pontos e conquista o primeiro lugar.
  </p>

  <button
    onClick={() => setPagina('prognosticos')}
    style={{
  background: '#c9a84c',
color: '#111118',
      border: 'none',
      padding: '12px 20px',
      borderRadius: '9px',
      fontWeight: 'bold',
      cursor: 'pointer',
    }}
  >
    🎯 Fazer prognósticos →
  </button>
</div>

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

         
<div
  style={{ ...cartao, cursor: 'pointer' }}
  onClick={() => setPagina('prognosticos')}
>
  <h3>⭐ Jogos Bónus</h3>
  <p>Dois jogos especiais por jornada</p>
</div>


        
<div
  style={{ ...cartao, cursor: 'pointer' }}
  onClick={() => setPagina('estatisticas')}
>
  <h3>📊 Estatísticas</h3>
  <p>Acompanha o teu desempenho</p>
</div>


<div
  style={{ ...cartao, cursor: 'pointer' }}
  onClick={() => setPagina('hall-da-fama')}
>
  <h3>🏆 Hall da Fama</h3>
  <p>Consulta os campeões e as classificações das épocas anteriores</p>
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

