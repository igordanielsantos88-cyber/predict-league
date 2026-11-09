
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function JogosParticipante() {
  const [jogos, setJogos] = useState([])
  
const [jornadas, setJornadas] = useState([])

  const [palpites, setPalpites] = useState({})
  
const [historico, setHistorico] = useState([])

const [filtroJogos, setFiltroJogos] = useState('todos')

  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')

const [aGuardar, setAGuardar] = useState(null)

async function guardarPalpite(jogo) {
  const palpite = palpites[jogo.id]

  if (
    palpite?.casa === undefined ||
    palpite?.fora === undefined ||
    palpite.casa === '' ||
    palpite.fora === ''
  ) {
    alert('Preenche os golos das duas equipas.')
    return
  }

  const casa = Number(palpite.casa)
  const fora = Number(palpite.fora)

  if (
    !Number.isInteger(casa) ||
    !Number.isInteger(fora) ||
    casa < 0 ||
    fora < 0
  ) {
    alert('Introduz números inteiros iguais ou superiores a zero.')
    return
  }

  if (new Date(jogo.kickoff).getTime() <= Date.now()) {
    alert('O prazo para este jogo já terminou.')
    return
  }

  setAGuardar(jogo.id)

  try {
    const { data: { user }, error: erroUtilizador } =
      await supabase.auth.getUser()

    if (erroUtilizador || !user) {
      alert('Tens de iniciar sessão para guardar o prognóstico.')
      return
    }

    const { error } = await supabase
      .from('predictions')
      .upsert(
        {
          match_id: jogo.id,
          user_id: user.id,
          home_goals: casa,
          away_goals: fora,
        },
        { onConflict: 'match_id,user_id' }
      )

    if (error) {
      alert('Não foi possível guardar: ' + error.message)
    } else {
      alert('Prognóstico guardado com sucesso! ⚽')
    }
  } finally {
    setAGuardar(null)
  }
}

  useEffect(() => {
    async function carregarJogos() {
   
const { data: epoca, error: erroEpoca } = await supabase
  .from('seasons')
  .select('id')
  .eq('competition_id', '549b62f6-1f54-48db-b002-adb0e4754642')
  .eq('status', 'active')
  .single()

if (erroEpoca || !epoca) {
  setErro('Não foi possível encontrar a época ativa.')
  setACarregar(false)
  return
}

const { data: dadosJornadas, error: erroJornadas } =
  await supabase
    .from('jornadas')
    .select('id, numero, nome')
    .eq('season_id', epoca.id)
    .order('numero', { ascending: true })

if (erroJornadas) {
  setErro('Erro ao carregar jornadas: ' + erroJornadas.message)
  setACarregar(false)
  return
}

setJornadas(dadosJornadas || [])

const { data, error } = await supabase
  .from('matches')
  .select('id, home_team, away_team, kickoff, is_bonus, jornada_id')
  .eq('competition_id', '549b62f6-1f54-48db-b002-adb0e4754642')
  .eq('season_id', epoca.id)
  .order('kickoff', { ascending: true })


      
if (error) {
  setErro('Erro ao carregar jogos: ' + error.message)
} else {
  setJogos(data || [])

  const { data: { user }, error: erroUtilizador } =
    await supabase.auth.getUser()

  if (erroUtilizador || !user) {
    setErro('Não foi possível identificar o participante.')
  } else {
    const { data: prognosticos, error: erroPrognosticos } =
      await supabase
        .from('predictions')
        .select('match_id, home_goals, away_goals')
        .eq('user_id', user.id)

    if (erroPrognosticos) {
      setErro(
        'Erro ao carregar prognósticos: ' +
        erroPrognosticos.message
      )
    } else {
      const palpitesGuardados = {}

      for (const prognostico of prognosticos || []) {
        palpitesGuardados[prognostico.match_id] = {
          casa: String(prognostico.home_goals),
          fora: String(prognostico.away_goals),
        }
      }

      setPalpites(palpitesGuardados)
      
const idsJogos = (data || []).map(jogo => jogo.id)

if (idsJogos.length > 0) {
  
const { data: pontuacoes, error: erroPontuacoes } =
  await supabase.rpc('obter_meus_pontos')


  if (erroPontuacoes) {
    setErro('Erro ao carregar histórico: ' + erroPontuacoes.message)
  } else {
    setHistorico(pontuacoes || [])
  }
} else {
  setHistorico([])
}

    }
  }
}


      setACarregar(false)
    }

    carregarJogos()
  }, [])

const jogosFiltrados = jogos.filter((jogo) => {
  const comecou =
    new Date(jogo.kickoff).getTime() <= Date.now()

  if (filtroJogos === 'por-jogar') {
    return !comecou
  }

  if (filtroJogos === 'terminados') {
    return comecou
  }

  return true
})

const jogosPorJornada = jornadas
  .map((jornada) => ({
    ...jornada,
    jogos: jogosFiltrados.filter(
      (jogo) => jogo.jornada_id === jornada.id
    ),
  }))
  .filter((jornada) => jornada.jogos.length > 0)

  if (aCarregar) {
    return <p>A carregar os jogos...</p>
  }

  if (erro) {
    return <p style={{ color: '#f87171' }}>{erro}</p>
  }

  return (
    <div>
      <h2>⚽ Jogos da Predict League</h2>

<div style={{
  display: 'flex',
  gap: '10px',
  marginBottom: '20px',
  flexWrap: 'wrap',
}}>
  {[
    ['todos', '⚽ Todos'],
    ['por-jogar', '📅 Por jogar'],
    ['terminados', '🏁 Terminados'],
  ].map(([valor, nome]) => (
    <button
      key={valor}
      type="button"
      onClick={() => setFiltroJogos(valor)}
      style={{
        padding: '10px 15px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        background: filtroJogos === valor
          ? '#22c55e'
          : '#29384d',
        color: filtroJogos === valor
          ? '#052e16'
          : 'white',
        fontWeight: 'bold',
      }}
    >
      {nome}
    </button>
  ))}
</div>

      
{jogosPorJornada.length === 0 ? (
  <p>Não existem jogos para o filtro selecionado.</p>

) : (
  jogosPorJornada.map((jornada) => (

  
<details key={jornada.id} open>

     <summary style={{
      color: '#22c55e',
      background: '#0f172a',
      padding: '15px',
      borderRadius: '10px',
      marginTop: '25px',
      marginBottom: '15px',
      borderLeft: '4px solid #22c55e',
    }}>
      
📅 {jornada.nome || `Jornada ${jornada.numero}`}
{' '}— {jornada.jogos.length}
{jornada.jogos.length === 1 ? ' jogo' : ' jogos'}

    /</summary>

   
{jornada.jogos.map((jogo) => (
  <div
    key={jogo.id}

            style={{
              background: '#172235',
              padding: '18px',
              borderRadius: '12px',
              marginBottom: '12px',
              border: '1px solid #29384d',
            }}
          >
            <h3>
              {jogo.home_team} vs {jogo.away_team}
            </h3>

            <p>
              📅 {new Date(jogo.kickoff).toLocaleString('pt-PT')}
            </p>

            {jogo.is_bonus && (
              <p style={{ color: '#facc15' }}>
                ⭐ Jogo Bónus — Pontuação a dobrar
              </p>
            )}
            
{(() => {
  const resultado = historico.find(
    item => item.match_id === jogo.id
  )

  if (!resultado || resultado.points === null) {
    return null
  }

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '10px',
      padding: '12px',
      marginTop: '12px',
    }}>
      
<p>
  🎯 O teu prognóstico:
  {' '}{palpites[jogo.id]?.casa}–{palpites[jogo.id]?.fora}
</p>

      <p>
        🏁 Resultado oficial:
        {' '}{resultado.home_score}–{resultado.away_score}
      </p>

      <p style={{
        color: '#22c55e',
        fontWeight: 'bold',
      }}>
        🏆 Pontos conquistados: +{resultado.points}
      </p>

      
{resultado.exact_score ? (
  <p style={{ color: '#22c55e' }}>
    🎯 Acertaste no resultado exato!
  </p>
) : resultado.points > 0 ? (
  <p style={{ color: '#facc15' }}>
    ✅ Acertaste na tendência!
  </p>
) : (
  <p style={{ color: '#f87171' }}>
    ❌ Não acertaste no prognóstico.
  </p>
)}

    </div>
  )
})()}

            {new Date(jogo.kickoff).getTime() > Date.now() ? (
  <div style={{ marginTop: '15px' }}>
    <p>🎯 O teu prognóstico:</p>

    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <input
        type="number"
        min="0"
        step="1"
        placeholder="Casa"
        value={palpites[jogo.id]?.casa ?? ''}
        onChange={(e) => setPalpites((anteriores) => ({
          ...anteriores,
          [jogo.id]: {
            ...anteriores[jogo.id],
            casa: e.target.value,
          },
        }))}
        style={{ width: '65px', padding: '10px' }}
      />

      <span>–</span>

      <input
        type="number"
        min="0"
        step="1"
        placeholder="Fora"
        value={palpites[jogo.id]?.fora ?? ''}
        onChange={(e) => setPalpites((anteriores) => ({
          ...anteriores,
          [jogo.id]: {
            ...anteriores[jogo.id],
            fora: e.target.value,
          },
        }))}
        style={{ width: '65px', padding: '10px' }}
      />
    </div>
    
<button
  type="button"
  onClick={() => guardarPalpite(jogo)}
  disabled={aGuardar === jogo.id}
  style={{
    marginTop: '15px',
    padding: '12px 18px',
    background: '#22c55e',
    color: '#052e16',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  }}
>
  {aGuardar === jogo.id
    ? 'A guardar...'
    : '💾 Guardar prognóstico'}
</button>

  </div>
) : (
  <p style={{ color: '#94a3b8' }}>
    🔒 Prognósticos encerrados — o jogo já começou.
  </p>
)}
         
          </div>
        ))}
      </details>
    ))
  )}


    </div>
  )
}

export default JogosParticipante
