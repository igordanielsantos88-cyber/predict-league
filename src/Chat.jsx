

import { useEffect, useState } from 'react'
import { supabase } from './supabase'


function Chat() {
  const [tipoChat, setTipoChat] = useState('geral')
  const [mensagem, setMensagem] = useState('')

const [mensagens, setMensagens] = useState([])
const [aCarregar, setACarregar] = useState(false)
const [erro, setErro] = useState('')

const COMPETICAO_ID = '549b62f6-1f54-48db-b002-adb0e4754642'

const [aEnviar, setAEnviar] = useState(false)

async function enviarMensagem() {
  const texto = mensagem.trim()

  if (!texto || aEnviar || tipoChat !== 'geral') return

  if (texto.length > 1000) {
    alert('A mensagem não pode ultrapassar 1000 caracteres.')
    return
  }

  setAEnviar(true)
  setErro('')

  try {
    const { error } = await supabase.rpc(
      'enviar_mensagem_chat',
      {
        p_competition_id: COMPETICAO_ID,
        p_mensagem: texto,
        p_match_id: null
      }
    )

    if (error) {
      setErro('Não foi possível enviar: ' + error.message)
      return
    }

    setMensagem('')
    await carregarMensagens()
  } catch {
    setErro('Ocorreu um erro ao enviar a mensagem.')
  } finally {
    setAEnviar(false)
  }
}

async function carregarMensagens(matchId = null) {
  setACarregar(true)
  setErro('')

  const { data, error } = await supabase.rpc(
    'obter_mensagens_chat',
    {
      p_competition_id: COMPETICAO_ID,
      p_match_id: matchId
    }
  )

  if (error) {
    setErro(error.message)
    setMensagens([])
  } else {
    setMensagens(data || [])
  }

  setACarregar(false)
}

useEffect(() => {
  if (tipoChat === 'geral') {
    carregarMensagens()
  }
}, [tipoChat])

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
         
{tipoChat === 'geral' ? (
  <>
    {aCarregar && (
      <p style={{ color: '#94a3b8' }}>
        A carregar mensagens...
      </p>
    )}

    {erro && (
      <p style={{ color: '#f87171' }}>
        Erro: {erro}
      </p>
    )}

    {!aCarregar && !erro && mensagens.length === 0 && (
      <p style={{ color: '#94a3b8' }}>
        Ainda não existem mensagens. Sê o primeiro a escrever!
      </p>
    )}

    {!aCarregar && !erro && mensagens.map((msg) => (
      <div
        key={msg.id}
        style={{
          padding: '12px',
          marginBottom: '10px',
          background: '#172235',
          borderRadius: '10px',
          border: '1px solid #29384d'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '8px'
        }}>
          <strong style={{ color: '#c9a84c' }}>
            👤 {msg.jogador}
          </strong>

          <small style={{ color: '#94a3b8' }}>
            {new Date(msg.criada_em).toLocaleString('pt-PT')}
          </small>
        </div>

        <p style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere'
        }}>
          {msg.mensagem}
        </p>
      </div>
    ))}
  </>
) : (
  <p style={{ color: '#94a3b8' }}>
    Aqui poderás escolher um jogo e conversar sobre ele.
  </p>
)}

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
  onClick={enviarMensagem}
  disabled={aEnviar || !mensagem.trim()}
  style={{
    padding: '12px 20px',
    background: '#c9a84c',
    color: '#0b1220',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: aEnviar ? 'wait' : 'pointer',
    opacity: aEnviar || !mensagem.trim() ? 0.5 : 1
  }}
>
  {aEnviar ? '⏳ A enviar...' : '📤 Enviar'}
</button>

          </div>
        )}
      </div>
    </div>
  )
}

export default Chat
