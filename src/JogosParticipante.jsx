
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function JogosParticipante() {
  const [jogos, setJogos] = useState([])
  const [palpites, setPalpites] = useState({})
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
      const { data, error } = await supabase
        .from('matches')
        .select('id, home_team, away_team, kickoff, is_bonus, jornada_id')
        .eq(
          'competition_id',
          '549b62f6-1f54-48db-b002-adb0e4754642'
        )
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
    }
  }
}


      setACarregar(false)
    }

    carregarJogos()
  }, [])

  if (aCarregar) {
    return <p>A carregar os jogos...</p>
  }

  if (erro) {
    return <p style={{ color: '#f87171' }}>{erro}</p>
  }

  return (
    <div>
      <h2>⚽ Jogos da Predict League</h2>

      {jogos.length === 0 ? (
        <p>Ainda não existem jogos disponíveis.</p>
      ) : (
        jogos.map((jogo) => (
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
        ))
      )}
    </div>
  )
}

export default JogosParticipante
