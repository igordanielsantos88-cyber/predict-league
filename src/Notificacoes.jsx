
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState([])
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [aMarcar, setAMarcar] = useState(null)
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      const { data, error } = await supabase.rpc(
        'obter_notificacoes'
      )

      if (!ativo) return

      setACarregar(false)

      if (error) {
        console.error('Erro nas notificações:', error)
        setErro(
          'Não foi possível carregar as notificações: ' +
          error.message
        )
      } else {
        setErro('')
        setNotificacoes(data || [])
      }
    }

    carregar()

    const intervalo = setInterval(carregar, 30000)

    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [])

  async function marcarLida(id) {
    setAMarcar(id)
    setErro('')

    try {
      const { data, error } = await supabase.rpc(
        'marcar_notificacao_lida',
        { p_notificacao_id: id }
      )

      if (error) {
        console.error('Erro ao marcar como lida:', error)
        setErro(error.message)
      } else if (data === true) {
        setNotificacoes(anteriores =>
          anteriores.map(n =>
            n.id === id ? { ...n, lida: true } : n
          )
        )
      } else {
        setErro('Não foi possível atualizar esta notificação.')
      }
    } catch (error) {
      console.error(error)
      setErro('Ocorreu um erro ao atualizar a notificação.')
    } finally {
      setAMarcar(null)
    }
  }

  const porLer = notificacoes.filter(n => !n.lida).length

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-label={`Notificações: ${porLer} por ler`}
        aria-expanded={aberto}
        style={{
          background: '#1b2535',
          color: '#e8c76a',
          border: '1px solid #8f722e',
          borderRadius: '10px',
          padding: '10px 14px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '15px',
        }}
      >
        🔔 {porLer > 0 ? porLer : ''}
      </button>

      {aberto && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 12px)',
            width: 'min(360px, calc(100vw - 32px))',
            maxHeight: '420px',
            overflowY: 'auto',
            background: '#172235',
            border: '1px solid #8f722e',
            borderRadius: '14px',
            padding: '18px',
            zIndex: 1000,
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            color: '#f8fafc',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
        >
          <h3 style={{
            marginTop: 0,
            marginBottom: '16px',
            color: '#e8c76a',
          }}>
            🔔 Notificações
          </h3>

          {aCarregar && (
            <p style={{ color: '#94a3b8' }}>
              A carregar notificações...
            </p>
          )}

          {erro && (
            <p style={{ color: '#f87171' }}>
              {erro}
            </p>
          )}

          {!aCarregar &&
            notificacoes.length === 0 &&
            !erro && (
              <p style={{ color: '#94a3b8' }}>
                Não tens notificações.
              </p>
            )}

          {notificacoes.map(n => (
            <div
              key={n.id}
              style={{
                padding: '14px 0',
                borderBottom: '1px solid #3d3b30',
                opacity: n.lida ? 0.65 : 1,
              }}
            >
              <strong style={{
                display: 'block',
                color: '#e8c76a',
                fontSize: '14px',
                marginBottom: '6px',
              }}>
                {n.titulo || 'Notificação'}
              </strong>

              <p style={{
                color: '#cbd5e1',
                fontSize: '13px',
                lineHeight: '1.5',
                margin: 0,
              }}>
                {n.mensagem}
              </p>

              {n.criada_em && (
                <small style={{
                  display: 'block',
                  color: '#94a3b8',
                  marginTop: '8px',
                }}>
                  {new Date(n.criada_em)
                    .toLocaleString('pt-PT')}
                </small>
              )}

              {!n.lida && (
                <button
                  type="button"
                  disabled={aMarcar === n.id}
                  onClick={() => marcarLida(n.id)}
                  style={{
                    background: '#d4af37',
                    color: '#211806',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '8px 12px',
                    marginTop: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {aMarcar === n.id
                    ? 'A atualizar...'
                    : 'Marcar como lida'}
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
