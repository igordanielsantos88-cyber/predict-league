
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const COMPETICAO_ID = '549b62f6-1f54-48db-b002-adb0e4754642'

function Estatisticas() {
  const [estatisticas, setEstatisticas] = useState(null)
  const [posicao, setPosicao] = useState(null)
  const [pontosLider, setPontosLider] = useState(null)
  const [taxaAcerto, setTaxaAcerto] = useState(null)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarEstatisticas() {
      const { data: utilizador, error: erroAuth } =
        await supabase.auth.getUser()

      if (erroAuth || !utilizador?.user) {
        setErro('Não foi possível identificar o participante.')
        setACarregar(false)
        return
      }

      const [resultadoLiga, resultadoTaxa] = await Promise.all([
        supabase.rpc('obter_classificacao', {
          p_competition_id: COMPETICAO_ID
        }),
        supabase.rpc('obter_taxa_acerto', {
          p_competition_id: COMPETICAO_ID
        })
      ])

      if (resultadoLiga.error) {
        setErro(resultadoLiga.error.message)
        setACarregar(false)
        return
      }

      const classificacao = resultadoLiga.data || []

      const meusDados = classificacao.find(
        jogador => jogador.user_id === utilizador.user.id
      )

      const indice = classificacao.findIndex(
        jogador => jogador.user_id === utilizador.user.id
      )

      setEstatisticas(meusDados || null)
      setPosicao(indice >= 0 ? indice + 1 : null)

      setPontosLider(
        classificacao.length > 0
          ? Math.max(
              ...classificacao.map(
                jogador => Number(jogador.pontos) || 0
              )
            )
          : null
      )

      if (resultadoTaxa.error) {
        console.error(
          'Erro ao carregar taxa de acerto:',
          resultadoTaxa.error
        )
        setTaxaAcerto(null)
      } else {
        setTaxaAcerto(
          resultadoTaxa.data?.[0]?.taxa_acerto ?? 0
        )
      }

      setACarregar(false)
    }

    carregarEstatisticas()
  }, [])

  const pontos = Number(estatisticas?.pontos || 0)
  const exatos = Number(estatisticas?.resultados_exatos || 0)
  const jogos = Number(estatisticas?.jogos_pontuados || 0)

  const precisao = jogos > 0
    ? ((exatos / jogos) * 100).toFixed(1) + '%'
    : '0%'

  const diferencaLider =
    pontosLider !== null
      ? Math.max(0, pontosLider - pontos)
      : null

  const cartoes = [
    {
      titulo: 'Posição na Liga',
      icone: '🥇',
      valor: posicao !== null ? `${posicao}.º` : '—'
    },
    {
      titulo: 'Pontos totais',
      icone: '🏆',
      valor: pontos
    },
    {
      titulo: 'Resultados exatos',
      icone: '🎯',
      valor: exatos
    },
    {
      titulo: 'Jogos pontuados',
      icone: '⚽',
      valor: jogos
    },
    {
      titulo: 'Precisão',
      icone: '📊',
      valor: precisao
    },
    {
      titulo: 'Pontos para o líder',
      icone: '👑',
      valor: diferencaLider !== null
        ? diferencaLider
        : '—'
    },
    {
      titulo: 'Taxa de acerto',
      icone: '🎯',
      valor: taxaAcerto !== null
        ? `${Number(taxaAcerto).toFixed(1)}%`
        : '—'
    }
  ]

  return (
    <div style={{
      color: 'white',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ color: '#c9a84c' }}>
        📊 As minhas estatísticas
      </h2>

      <p style={{ color: '#94a3b8' }}>
        Acompanha o teu desempenho na época atual.
      </p>

      {aCarregar && (
        <p>A carregar estatísticas...</p>
      )}

      {erro && (
        <p style={{ color: '#f87171' }}>
          Erro: {erro}
        </p>
      )}

      {!aCarregar && !erro && !estatisticas && (
        <p>Ainda não existem estatísticas para esta época.</p>
      )}

      {!aCarregar && !erro && estatisticas && (
        <>
          <h3 style={{ marginTop: '30px' }}>
            🏆 Resumo da época
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginTop: '20px'
          }}>
            {cartoes.map(cartao => (
              <div
                key={cartao.titulo}
                style={{
                  background:
                    'linear-gradient(145deg, #1c1c24, #111118)',
                  border: '1px solid #8b733a',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  boxShadow:
                    '0 6px 20px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ fontSize: '28px' }}>
                  {cartao.icone}
                </div>

                <p style={{
                  color: '#94a3b8',
                  fontSize: '14px'
                }}>
                  {cartao.titulo}
                </p>

                <h2 style={{
                  color: '#c9a84c',
                  fontSize: '32px',
                  margin: '10px 0'
                }}>
                  {cartao.valor}
                </h2>
              </div>
            ))}
          </div>

          <p style={{
            color: '#94a3b8',
            fontSize: '13px',
            marginTop: '25px'
          }}>
            A precisão corresponde à percentagem de
            resultados exatos nos jogos pontuados.
            A taxa de acerto corresponde à percentagem
            de prognósticos em que acertaste no vencedor
            ou no empate.
          </p>
        </>
      )}
    </div>
  )
}

export default Estatisticas
