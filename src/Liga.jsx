
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const COMPETICAO_ID = '549b62f6-1f54-48db-b002-adb0e4754642'

function Liga() {
  const [classificacao, setClassificacao] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarClassificacao() {
     const { data, error } = await supabase
  .rpc('obter_classificacao', {
    p_competition_id: COMPETICAO_ID
  })

      if (error) {
        setErro(error.message)
      } else {
        setClassificacao(data || [])
      }

      setACarregar(false)
    }

    carregarClassificacao()
  }, [])

  return (
    <div style={{
      background: '#0b1220',
      color: 'white',
      minHeight: '100vh',
      padding: '25px',
      fontFamily: 'Arial, sans-serif',
    }}>
      <h1 style={{ color: '#22c55e' }}>
        🏆 Classificação Predict League
      </h1>

      {aCarregar && <p>A carregar classificação...</p>}

      {erro && (
        <p style={{ color: '#f87171' }}>
          Erro: {erro}
        </p>
      )}

      {!aCarregar && !erro && (
        <>
          <p>
            Jogadores inscritos: {classificacao.length}
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '20px',
              minWidth: '450px',
            }}>
              <thead>
                <tr style={{ background: '#172235' }}>
                  <th style={{ padding: '14px' }}>Pos.</th>
                  <th style={{ padding: '14px', textAlign: 'left' }}>
                    Jogador
                  </th>
                  <th style={{ padding: '14px' }}>Jogos</th>
                  <th style={{ padding: '14px' }}>Pontos</th>
                  <th style={{ padding: '14px' }}>Exatos</th>
                </tr>
              </thead>

              <tbody>
                {classificacao.map((jogador, indice) => (
                  <tr
                    key={jogador.user_id}
                    style={{
                      borderBottom: '1px solid #29384d',
                    }}
                  >
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      {indice + 1}.º
                    </td>

                    <td style={{ padding: '14px' }}>
                      {jogador.jogador}
                    </td>

                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      {jogador.jogos_pontuados}
                    </td>

                    <td style={{
                      padding: '14px',
                      textAlign: 'center',
                      color: '#22c55e',
                      fontWeight: 'bold',
                    }}>
                      {jogador.pontos}
                    </td>

                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      {jogador.resultados_exatos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Liga
