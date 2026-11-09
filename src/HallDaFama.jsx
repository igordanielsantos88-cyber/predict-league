
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function HallDaFama() {
  const [epocas, setEpocas] = useState([])
  const [epocaId, setEpocaId] = useState('')
  const [classificacao, setClassificacao] = useState([])
  const [carregar, setCarregar] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarEpocas() {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, status')
        .order('created_at', { ascending: false })

      if (error) {
        setErro(error.message)
      } else {
        setEpocas(data || [])
        const concluida = data?.find(
          e => e.status === 'completed'
        )
        setEpocaId(concluida?.id || data?.[0]?.id || '')
      }
      setCarregar(false)
    }

    carregarEpocas()
  }, [])

  useEffect(() => {
    if (!epocaId) return

    async function carregarClassificacao() {
      setCarregar(true)
      setErro('')

      const { data, error } = await supabase
        .from('hall_of_fame')
        .select('position, participant_name, total_points')
        .eq('season_id', epocaId)
        .order('position', { ascending: true })

      if (error) setErro(error.message)
      else setClassificacao(data || [])

      setCarregar(false)
    }

    carregarClassificacao()
  }, [epocaId])

  const cartao = {
    background: '#172235',
    border: '1px solid #29384d',
    borderRadius: 14,
    padding: 20
  }

  return (
    <div style={{
      color: '#fff',
      maxWidth: 950,
      margin: '0 auto',
      padding: 20
    }}>
      <h1>🏆 Hall da Fama</h1>
      <p style={{ color: '#94a3b8' }}>
        Os melhores participantes de cada época.
      </p>

      <select
        value={epocaId}
        onChange={e => setEpocaId(e.target.value)}
        style={{
          padding: 12,
          background: '#172235',
          color: 'white',
          border: '1px solid #29384d',
          borderRadius: 8,
          marginBottom: 25
        }}
      >
        {epocas.map(epoca => (
          <option key={epoca.id} value={epoca.id}>
            {epoca.name}
          </option>
        ))}
      </select>

      {carregar && <p>A carregar...</p>}
      {erro && <p style={{ color: '#f87171' }}>{erro}</p>}

      {!carregar && !erro && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 15,
            marginBottom: 25
          }}>
            {classificacao.slice(0, 3).map((p, i) => (
              <div key={p.position} style={{
                ...cartao,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 36 }}>
                  {['🥇', '🥈', '🥉'][i]}
                </div>
                <h2>{p.participant_name}</h2>
                <strong>{p.total_points} pontos</strong>
              </div>
            ))}
          </div>

          <div style={cartao}>
            <h2>Classificação final</h2>

            {classificacao.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>
                Ainda não existem resultados nesta época.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left'
                }}>
                  <thead>
                    <tr>
                      <th style={{ padding: 12 }}>Pos.</th>
                      <th style={{ padding: 12 }}>Participante</th>
                      <th style={{ padding: 12 }}>Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classificacao.map(p => (
                      <tr key={p.position} style={{
                        borderTop: '1px solid #29384d'
                      }}>
                        <td style={{ padding: 12 }}>
                          {p.position}.º
                        </td>
                        <td style={{ padding: 12 }}>
                          {p.participant_name}
                        </td>
                        <td style={{ padding: 12 }}>
                          <strong>{p.total_points}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
