
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState([])
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [aCarregar, setACarregar] = useState(true)

  async function carregarNotificacoes() {
    const { data, error } = await supabase.rpc(
      'obter_notificacoes'
    )

    if (error) {
      setErro('Não foi possível carregar as notificações.')
    } else {
      setNotificacoes(data || [])
      setErro('')
    }

    setACarregar(false)
  }

  useEffect(() => {
    carregarNotificacoes()

    const intervalo = setInterval(() => {
      carregarNotificacoes()
    }, 30000)

    return () => clearInterval(intervalo)
  }, [])

  async function marcarComoLida(id) {
    const { error } = await supabase.rpc(
      'marcar_notificacao_lida',
      { p_notificacao_id: id }
    )

    if (error) {
      setErro('Não foi possível marcar a notificação como lida.')
      return
    }

    await carregarNotificacoes()
  }

  const porLer = notificacoes.filter(
    notificacao => !notificacao.lida
  ).length

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        style={{
          background: '#172235',
          color: 'white',
          border: '1px solid #c9a84c',
          borderRadius: '10px',
          padding: '10px 14px',
          cursor: 'pointer',
          fontSize: '20px'
        }}
        aria-label={`Notificações: ${porLer} por ler`}
      >
        🔔 {porLer > 0 && (
          <span style={{
            background: '#ef4444',
            color: 'white',
            borderRadius: '20px',
            padding: '3px 7px',
            fontSize: '12px',
            marginLeft: '5px'
          }}>
            {porLer}
          </span>
        )}
      </button>

      {aberto && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '55px',
          width: 'min(320px, 85vw)',
          maxHeight: '400px',
          overflowY: 'auto',
          background: '#172235',
          border: '1px solid #c9a84c',
          borderRadius: '12px',
          padding: '15px',
          zIndex: 100,
          boxShadow: '0 8px 25px rgba(0,0,0,0.4)'
        }}>
          <h3 style={{ marginTop: 0 }}>
            🔔 Notificações
          </h3>

          {aCarregar && <p>A carregar...</p>}

          {erro && (
            <p style={{ color: '#f87171' }}>{erro}</p>
          )}

          {!aCarregar && notificacoes.length === 0 && (
            <p style={{ color: '#94a3b8' }}>
              Ainda não tens notificações.
            </p>
          )}

          {notificacoes.map(notificacao => (
            <div
              key={notificacao.id}
              style={{
                padding: '12px',
                marginBottom: '10px',
                borderRadius: '8px',
                background: notificacao.lida
                  ? '#1e293b'
                  : '#334155',
                borderLeft: notificacao.lida
                  ? '3px solid #64748b'
                  : '3px solid #c9a84c'
              }}
            >
              <strong>{notificacao.titulo}</strong>

              <p style={{
                fontSize: '14px',
                margin: '8px 0'
              }}>
                {notificacao.mensagem}
              </p>

              <small style={{ color: '#94a3b8' }}>
                {new Date(
                  notificacao.criada_em
                ).toLocaleString('pt-PT')}
              </small>

              {!notificacao.lida && (
                <button
                  type="button"
                  onClick={() =>
                    marcarComoLida(notificacao.id)
                  }
                  style={{
                    display: 'block',
                    marginTop: '10px',
                    background: '#c9a84c',
                    color: '#111118',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 10px',
                    cursor: 'pointer'
                  }}
                >
                  Marcar como lida
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notificacoes

