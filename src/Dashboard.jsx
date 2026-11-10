
import { useState } from 'react'
import JogosParticipante from './JogosParticipante'
import Liga from './Liga'
import Participantes from './Participantes'
import Jornadas from './Jornadas'
import HallDaFama from './HallDaFama'
import Estatisticas from './Estatisticas'
import Chat from './Chat'

const secoes = [
  {
    id: 'prognosticos',
    icone: '🎯',
    nome: 'Prognósticos',
    descricao: 'Consulta os jogos e faz os teus palpites',
  },
  {
    id: 'liga',
    icone: '🏆',
    nome: 'Classificação',
    descricao: 'Acompanha a tabela da competição',
  },
  {
    id: 'jornadas',
    icone: '📅',
    nome: 'Jornadas',
    descricao: 'Gere as jornadas e os jogos',
  },
  {
    id: 'participantes',
    icone: '👥',
    nome: 'Participantes',
    descricao: 'Consulta e aprova participantes',
  },
  {
    id: 'estatisticas',
    icone: '📊',
    nome: 'Estatísticas',
    descricao: 'Consulta os números da competição',
  },
  {
    id: 'hall-da-fama',
    icone: '🥇',
    nome: 'Hall da Fama',
    descricao: 'Consulta os campeões das épocas anteriores',
  },
  {
    id: 'chat',
    icone: '💬',
    nome: 'Chat',
    descricao: 'Conversa com os participantes',
  },
]

const estilos = `
  .pl-dashboard {
    min-height: 100vh;
    box-sizing: border-box;
    background:
      radial-gradient(ellipse at 50% 0%, #262013 0%, transparent 45%),
      #090d16;
    color: #f8fafc;
    padding: 28px;
    font-family: Arial, sans-serif;
  }

  .pl-dashboard * {
    box-sizing: border-box;
  }

  .pl-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 32px;
  }

  .pl-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pl-logo-icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #d4af37, #8f6b1f);
    border-radius: 15px;
    font-size: 27px;
    box-shadow: 0 6px 24px #d4af3726;
  }

  .pl-logo h1 {
    margin: 0;
    color: #e8c76a;
    font-size: clamp(22px, 4vw, 30px);
    letter-spacing: -0.6px;
  }

  .pl-subtitle {
    margin: 5px 0 0;
    color: #94a3b8;
    font-size: 13px;
  }

  .pl-hero {
    position: relative;
    overflow: hidden;
    background: linear-gradient(120deg, #1b2231, #302718 75%, #453317);
    border: 1px solid #8f722e;
    border-radius: 22px;
    padding: clamp(24px, 5vw, 42px);
    margin-bottom: 28px;
    box-shadow: 0 12px 40px #00000030;
  }

  .pl-hero::after {
    content: '🏆';
    position: absolute;
    right: 5%;
    top: 50%;
    transform: translateY(-50%);
    font-size: clamp(90px, 16vw, 180px);
    opacity: 0.12;
    pointer-events: none;
  }

  .pl-hero-content {
    position: relative;
    z-index: 1;
    max-width: 620px;
  }

  .pl-eyebrow {
    color: #e8c76a;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .pl-hero h2 {
    font-size: clamp(26px, 5vw, 38px);
    margin: 12px 0;
    line-height: 1.2;
  }

  .pl-hero p {
    color: #cbd5e1;
    font-size: 15px;
    line-height: 1.7;
    margin-bottom: 24px;
  }

  .pl-gold-button {
    background: linear-gradient(135deg, #f0d477, #c69c32);
    color: #211806;
    border: none;
    border-radius: 11px;
    padding: 13px 22px;
    font-weight: bold;
    font-size: 14px;
    cursor: pointer;
    transition: transform .2s, box-shadow .2s;
  }

  .pl-gold-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px #d4af3740;
  }

  .pl-section-title {
    color: #f8fafc;
    font-size: 20px;
    margin: 0 0 18px;
  }

  .pl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
    gap: 18px;
  }

  .pl-card {
    background: linear-gradient(145deg, #1b2535, #111722);
    border: 1px solid #3d3b30;
    border-radius: 18px;
    padding: 24px;
    color: #f8fafc;
    text-align: left;
    cursor: pointer;
    min-height: 190px;
    width: 100%;
    transition:
      transform .2s ease,
      border-color .2s ease,
      box-shadow .2s ease;
  }

  .pl-card:hover {
    transform: translateY(-5px);
    border-color: #d4af37;
    box-shadow: 0 12px 32px #00000045;
  }

  .pl-card:focus-visible,
  .pl-gold-button:focus-visible,
  .pl-back:focus-visible {
    outline: 2px solid #f0d477;
    outline-offset: 3px;
  }

  .pl-card-icon {
    display: inline-grid;
    place-items: center;
    width: 48px;
    height: 48px;
    background: #d4af3717;
    border: 1px solid #d4af3735;
    border-radius: 13px;
    font-size: 24px;
    margin-bottom: 16px;
  }

  .pl-card h3 {
    margin: 0 0 9px;
    color: #e8c76a;
    font-size: 18px;
  }

  .pl-card p {
    color: #94a3b8;
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
  }

  .pl-back {
    background: #1b2535;
    border: 1px solid #8f722e;
    color: #e8c76a;
    border-radius: 10px;
    padding: 11px 17px;
    cursor: pointer;
    font-weight: bold;
  }

  .pl-content {
    background: #131c2b;
    border: 1px solid #3d3b30;
    border-radius: 18px;
    padding: 22px;
    min-width: 0;
  }

  @media (max-width: 600px) {
    .pl-dashboard {
      padding: 16px;
    }

    .pl-header {
      margin-bottom: 22px;
    }

    .pl-logo-icon {
      width: 44px;
      height: 44px;
    }

    .pl-hero::after {
      right: -20px;
      opacity: 0.07;
    }

    .pl-grid {
      gap: 12px;
    }

    .pl-card {
      min-height: 155px;
      padding: 19px;
    }

    .pl-content {
      padding: 12px;
    }
  }
`

function Dashboard() {
  const [pagina, setPagina] = useState('inicio')

  const componentes = {
    prognosticos: <JogosParticipante />,
    liga: <Liga />,
    jornadas: <Jornadas />,
    participantes: <Participantes />,
    estatisticas: <Estatisticas />,
    'hall-da-fama': <HallDaFama />,
    chat: <Chat />,
  }

  const secaoAtual = secoes.find(s => s.id === pagina)

  return (
    <div className="pl-dashboard">
      <style>{estilos}</style>

      <header className="pl-header">
        <div className="pl-logo">
          <div className="pl-logo-icon">⚽</div>

          <div>
            <h1>Predict League</h1>
            <p className="pl-subtitle">
              A tua liga de prognósticos
            </p>
          </div>
        </div>

        {pagina !== 'inicio' && (
          <button
            type="button"
            className="pl-back"
            onClick={() => setPagina('inicio')}
          >
            ← Dashboard
          </button>
        )}
      </header>

      {pagina === 'inicio' ? (
        <>
          <section className="pl-hero">
            <div className="pl-hero-content">
              <span className="pl-eyebrow">
                A competição começa aqui
              </span>

              <h2>🏆 A tua competição</h2>

              <p>
                Faz os teus prognósticos, acompanha a
                classificação e disputa o primeiro lugar
                com os restantes participantes.
              </p>

              <button
                type="button"
                className="pl-gold-button"
                onClick={() => setPagina('prognosticos')}
              >
                🎯 Fazer prognósticos
              </button>
            </div>
          </section>

          <h2 className="pl-section-title">
            Explorar a competição
          </h2>

          <div className="pl-grid">
            {secoes.map(secao => (
              <button
                type="button"
                key={secao.id}
                className="pl-card"
                onClick={() => setPagina(secao.id)}
              >
                <span className="pl-card-icon">
                  {secao.icone}
                </span>

                <h3>{secao.nome}</h3>

                <p>{secao.descricao}</p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <main className="pl-content">
          <h2 style={{
            color: '#e8c76a',
            marginTop: 0,
            marginBottom: '22px',
          }}>
            {secaoAtual?.icone} {secaoAtual?.nome}
          </h2>

          {componentes[pagina]}
        </main>
      )}
    </div>
  )
}

export default Dashboard
