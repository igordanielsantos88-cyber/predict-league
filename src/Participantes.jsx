
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function Participantes() {
  const [participantes, setParticipantes] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [aAprovar, setAAprovar] = useState(null)

  async function carregarParticipantes() {
    setACarregar(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, approval_status, created_at')
      .eq('role', 'participant')
      .order('created_at', { ascending: false })

    if (error) {
      alert('Erro ao carregar participantes: ' + error.message)
    } else {
      setParticipantes(data || [])
    }

    setACarregar(false)
  }

  useEffect(() => {
    carregarParticipantes()
  }, [])

  async function aprovarParticipante(id) {
    if (!window.confirm('Queres aprovar este participante?')) return

    setAAprovar(id)

    const { error } = await supabase.rpc(
      'aprovar_participante',
      { p_user_id: id }
    )

    if (error) {
      alert('Erro ao aprovar: ' + error.message)
    } else {
      alert('Participante aprovado e inscrito na Predict League! 🏆')
      await carregarParticipantes()
    }

    setAAprovar(null)
  }

  const pendentes = participantes.filter(
    (p) => p.approval_status === 'pending'
  )

  const aprovados = participantes.filter(
    (p) => p.approval_status === 'approved'
  )

  return (
    <div style={{ padding: '25px', color: 'white' }}>
      <h2>👥 Gerir Participantes</h2>

      <p style={{ color: '#94a3b8' }}>
        Aprova e gere os participantes da Predict League.
      </p>

      <button
        onClick={carregarParticipantes}
        style={{
          padding: '10px 16px',
          background: '#334155',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        🔄 Atualizar lista
      </button>

      {aCarregar ? (
        <p>A carregar participantes...</p>
      ) : (
        <>
          <h3 style={{ marginTop: '30px' }}>
            ⏳ Pedidos pendentes ({pendentes.length})
          </h3>

          {pendentes.length === 0 ? (
            <p>Não existem pedidos pendentes.</p>
          ) : (
            pendentes.map((p) => (
              <div
                key={p.id}
                style={{
                  background: '#172235',
                  padding: '16px',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  border: '1px solid #29384d',
                }}
              >
                <strong>{p.display_name || 'Sem nome'}</strong>

                <p style={{ color: '#94a3b8' }}>
                  {p.email}
                </p>

                <button
                  disabled={aAprovar !== null}
                  onClick={() => aprovarParticipante(p.id)}
                  style={{
                    padding: '10px 16px',
                    background: '#22c55e',
                    color: '#0b1220',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {aAprovar === p.id
                    ? 'A aprovar...'
                    : '✓ Aprovar'}
                </button>
              </div>
            ))
          )}

          <h3 style={{ marginTop: '35px' }}>
            ✅ Participantes aprovados ({aprovados.length})
          </h3>

          {aprovados.length === 0 ? (
            <p>Ainda não existem participantes aprovados.</p>
          ) : (
            aprovados.map((p) => (
              <div
                key={p.id}
                style={{
                  background: '#172235',
                  padding: '14px',
                  borderRadius: '10px',
                  marginBottom: '10px',
                  border: '1px solid #29384d',
                }}
              >
                <strong>✅ {p.display_name || 'Sem nome'}</strong>
                <p style={{ color: '#94a3b8' }}>{p.email}</p>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}

export default Participantes
