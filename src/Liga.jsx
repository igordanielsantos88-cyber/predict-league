
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const COMPETICAO_ID = '549b62f6-1f54-48db-b002-adb0e4754642'

function Liga() {
  const [classificacao, setClassificacao] = useState([])
  
const [tipoClassificacao, setTipoClassificacao] = useState('geral')
const [jornadas, setJornadas] = useState([])
const [jornadaSelecionada, setJornadaSelecionada] = useState('')
const [classificacaoJornada, setClassificacaoJornada] = useState([])
const [aCarregarJornada, setACarregarJornada] = useState(false)
const [erroJornada, setErroJornada] = useState('')

const [utilizadorAtual, setUtilizadorAtual] = useState(null)

const minhaPosicao = classificacao.findIndex(
  jogador => jogador.user_id === utilizadorAtual
)

const classificacaoVisivel =
  tipoClassificacao === 'geral'
    ? classificacao
    : classificacaoJornada

const minhaPosicaoVisivel = classificacaoVisivel.findIndex(
  jogador => jogador.user_id === utilizadorAtual
)

const meusDadosVisiveis = minhaPosicaoVisivel >= 0
  ? classificacaoVisivel[minhaPosicaoVisivel]
  : null

const meusDados = minhaPosicao >= 0
  ? classificacao[minhaPosicao]
  : null

  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')

useEffect(() => {
  if (tipoClassificacao !== 'jornada' || !jornadaSelecionada) {
    return
  }

  let ativo = true

  async function carregarClassificacaoJornada() {
    setACarregarJornada(true)
    setErroJornada('')

    const { data, error } = await supabase.rpc(
      'obter_classificacao_jornada',
      {
        p_competition_id: COMPETICAO_ID,
        p_jornada_id: jornadaSelecionada
      }
    )

    if (!ativo) return

    if (error) {
      setErroJornada(error.message)
      setClassificacaoJornada([])
    } else {
      setClassificacaoJornada(data || [])
    }

    setACarregarJornada(false)
  }

  carregarClassificacaoJornada()

  return () => {
    ativo = false
  }
}, [tipoClassificacao, jornadaSelecionada])

useEffect(() => {
  async function carregarJornadas() {
    const { data: epoca, error: erroEpoca } = await supabase
      .from('seasons')
      .select('id')
      .eq('competition_id', COMPETICAO_ID)
      .eq('status', 'active')
      .single()

    if (erroEpoca || !epoca) {
      setErroJornada('Não foi possível encontrar a época ativa.')
      return
    }

    const { data, error } = await supabase
      .from('jornadas')
      .select('id, numero, nome')
      .eq('season_id', epoca.id)
      .order('numero', { ascending: true })

    if (error) {
      setErroJornada(error.message)
      return
    }

    setJornadas(data || [])

    if (data?.length > 0) {
      setJornadaSelecionada(data[0].id)
    }
  }

  carregarJornadas()
}, [])

  useEffect(() => {
    async function carregarClassificacao() {
      
const { data: { user } } = await supabase.auth.getUser()
setUtilizadorAtual(user?.id ?? null)

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

<div style={{
  display: 'flex',
  gap: '10px',
  marginTop: '20px',
  marginBottom: '25px',
  flexWrap: 'wrap'
}}>
  <button
    type="button"
    onClick={() => setTipoClassificacao('geral')}
    style={{
      padding: '12px 20px',
      background: tipoClassificacao === 'geral' ? '#c9a84c' : '#172235',
      color: tipoClassificacao === 'geral' ? '#0b1220' : 'white',
      border: 'none',
      borderRadius: '10px',
      fontWeight: 'bold',
      cursor: 'pointer'
    }}
  >
    🏆 Geral
  </button>

  <button
    type="button"
    onClick={() => setTipoClassificacao('jornada')}
    style={{
      padding: '12px 20px',
      background: tipoClassificacao === 'jornada' ? '#c9a84c' : '#172235',
      color: tipoClassificacao === 'jornada' ? '#0b1220' : 'white',
      border: 'none',
      borderRadius: '10px',
      fontWeight: 'bold',
      cursor: 'pointer'
    }}
  >
    📅 Por jornada
  </button>
</div>

{tipoClassificacao === 'jornada' && (
  <div style={{ marginBottom: '25px' }}>
    <label
      htmlFor="selecionar-jornada"
      style={{
        display: 'block',
        marginBottom: '10px',
        color: '#c9a84c',
        fontWeight: 'bold'
      }}
    >
      📅 Escolher jornada
    </label>

    <select
      id="selecionar-jornada"
      value={jornadaSelecionada}
      onChange={(e) => setJornadaSelecionada(e.target.value)}
      style={{
        width: '100%',
        maxWidth: '350px',
        padding: '12px',
        background: '#172235',
        color: 'white',
        border: '1px solid #c9a84c',
        borderRadius: '10px',
        fontSize: '15px'
      }}
    >
      {jornadas.length === 0 && (
        <option value="">Sem jornadas disponíveis</option>
      )}

      {jornadas.map((jornada) => (
        <option key={jornada.id} value={jornada.id}>
          {jornada.nome || `Jornada ${jornada.numero}`}
        </option>
      ))}
    </select>
  </div>
)}

     
{tipoClassificacao === 'geral' && aCarregar && (
  <p>A carregar classificação geral...</p>
)}

{tipoClassificacao === 'jornada' && aCarregarJornada && (
  <p>A carregar classificação da jornada...</p>
)}

{tipoClassificacao === 'geral' && erro && (
  <p style={{ color: '#f87171' }}>
    Erro: {erro}
  </p>
)}

{tipoClassificacao === 'jornada' && erroJornada && (
  <p style={{ color: '#f87171' }}>
    Erro: {erroJornada}
  </p>
)}

      
{!(tipoClassificacao === 'geral' ? aCarregar : aCarregarJornada) &&
 !(tipoClassificacao === 'geral' ? erro : erroJornada) &&
 (tipoClassificacao === 'geral' || jornadaSelecionada) && (

        <>
          <p>
Jogadores inscritos: {classificacaoVisivel.length}
          </p>

{meusDadosVisiveis && (
  <div style={{
    background: '#172235',
    border: '1px solid #3b82f6',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px',
    marginBottom: '20px',
  }}>
    <h3 style={{ color: '#60a5fa' }}>
      👤 A minha classificação
    </h3>

<p>🏆 Posição: {minhaPosicaoVisivel + 1}.º</p>

<p>⭐ Pontos: {meusDadosVisiveis.pontos}</p>

<p>🎯 Resultados exatos: {meusDadosVisiveis.resultados_exatos}</p>

<p>⚽ Jogos pontuados: {meusDadosVisiveis.jogos_pontuados}</p>

  </div>
)}

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
                  
<th style={{ padding: '14px' }}>Precisão</th>

                </tr>
              </thead>

              <tbody>
                {classificacaoVisivel.map((jogador, indice) => (
                 
<tr
  key={jogador.user_id}
  style={{
    borderBottom: '1px solid #29384d',
   
background: jogador.user_id === utilizadorAtual
  ? 'rgba(59, 130, 246, 0.20)'
  : indice === 0
    ? 'rgba(250, 204, 21, 0.12)'
    : 'transparent',

  }}
>
            
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      
{indice === 0 ? '🥇' :
 indice === 1 ? '🥈' :
 indice === 2 ? '🥉' :
 `${indice + 1}.º`}

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
<td style={{ padding: '14px', textAlign: 'center' }}>
  {Number(jogador.jogos_pontuados) > 0
    ? (
        Number(jogador.resultados_exatos) /
        Number(jogador.jogos_pontuados) * 100
      ).toFixed(1) + '%'
    : '0%'}
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
