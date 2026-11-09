
import { useState } from 'react'

function Chat() {
  const [tipoChat, setTipoChat] = useState('geral')
  const [mensagem, setMensagem] = useState('')

  return (
    <div style={{
      background: '#0b1220',
      color: 'white',
      minHeight: '100vh',
      padding: '25px'
    }}>
      <h1 style={{ color: '#c9a84c' }}>
        💬 Chat Predict League
      </h1>

      <p style={{ color: '#94a3b8' }}>
        Conversa com os outros participantes da competição.
      </p>

      <div style={{
        display: 'flex',
        gap: '10px',
        marginTop: '25px',
        marginBottom: '25px',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setTipoChat('geral')}
          style={{
            padding: '12px 20px',
            background: tipoChat === 'geral' ? '#c9a84c' : '#172235',
            color: tipoChat === 'geral' ? '#0b1220' : 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🌍 Chat geral
        </button>

        <button
          type="button"
          onClick={() => setTipoChat('jogos')}
          style={{
            padding: '12px 20px',
            background: tipoChat === 'jogos' ? '#c9a84c' : '#172235',
            color: tipoChat === 'jogos' ? '#0b1220' : 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          ⚽ Chat por jogo
        </button>
      </div>

      <div style={{
        background: '#172235',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #29384d'
      }}>
        <h3>
          {tipoChat === 'geral'
            ? '🌍 Conversa geral'
            : '⚽ Conversas dos jogos'}
        </h3>

        <div style={{
          minHeight: '250px',
          padding: '20px',
          background: '#0f172a',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <p style={{ color: '#94a3b8' }}>
            {tipoChat === 'geral'
              ? 'As mensagens dos participantes vão aparecer aqui.'
              : 'Aqui poderás escolher um jogo e conversar sobre ele.'}
          </p>
        </div>

        {tipoChat === 'geral' && (
          <div style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              placeholder="Escreve uma mensagem..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              style={{
                flex: 1,
                minWidth: '180px',
                padding: '12px',
                background: '#0f172a',
                color: 'white',
                border: '1px solid #334155',
                borderRadius: '8px'
              }}
            />

            <button
              type="button"
              disabled
              style={{
                padding: '12px 20px',
                background: '#c9a84c',
                color: '#0b1220',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                opacity: 0.5
              }}
            >
              📤 Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat
