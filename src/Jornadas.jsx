
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
function Jornadas() {
  const [nome, setNome] = useState('')
const [jornadaSelecionada, setJornadaSelecionada] = useState(null)
const [equipaCasa, setEquipaCasa] = useState('')
const [equipaVisitante, setEquipaVisitante] = useState('')
const [dataJogo, setDataJogo] = useState('')
const [jornadas, setJornadas] = useState([])
const [jogos, setJogos] = useState([])
const [aAtualizarBonus, setAAtualizarBonus] = useState(false)
const [jogoResultado, setJogoResultado] = useState(null)
const [golosCasa, setGolosCasa] = useState('')
const [golosVisitante, setGolosVisitante] = useState('')
useEffect(() => {
  async function carregarJornadas() {
    const { data, error } = await supabase
      .from('jornadas')
      .select('id, numero, nome')
      .order('numero', { ascending: true })

    if (error) {
      console.error('Erro ao carregar jornadas:', error.message)
      return
    }

    setJornadas(data || [])
  }

  carregarJornadas()
      async function carregarJogos() {
      const { data, error } = await supabase
        .from('matches')
        .select('id, jornada_id, home_team, away_team, kickoff, is_bonus, status, home_score, away_score')
        .order('kickoff', { ascending: true })

      if (error) {
        console.error('Erro ao carregar jogos:', error.message)
        return
      }

      setJogos(data || [])
    }

    carregarJogos()
}, [])

  return (
    <div style={{ padding: '25px', color: 'white' }}>
      <h2>📅 Gerir Jornadas</h2>

      <p>Cria e organiza as jornadas da Predict League.</p>

      <input
        type="text"
        placeholder="Ex.: Jornada 25"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        style={{
          padding: '12px',
          borderRadius: '8px',
          width: '250px',
          maxWidth: '100%',
        }}
      />
      <button
        type="button"
        
onClick={async () => {
  const numero = Number(nome.trim().match(/\d+$/)?.[0])

  if (!Number.isInteger(numero) || numero <= 0) {
    alert('Escreve um nome como Jornada 25.')
    return
  }

  const { data: competicao, error: erroCompeticao } = await supabase
    .from('competitions')
    .select('id')
    .eq('name', 'Predict League')
    .single()

  if (erroCompeticao || !competicao) {
    alert('Não foi possível encontrar a competição.')
    return
  }

  const { error } = await supabase
    .from('jornadas')
    .insert({
      competition_id: competicao.id,
      numero: numero,
      nome: nome.trim(),
    })

  if (error) {
    alert('Erro ao criar jornada: ' + error.message)
    return
  }

 const { data: listaAtualizada, error: erroLista } = await supabase
  .from('jornadas')
  .select('id, numero, nome')
  .order('numero', { ascending: true })

if (!erroLista) {
  setJornadas(listaAtualizada || [])
}

alert('Jornada criada com sucesso!')
setNome('')
}}

        style={{
          display: 'block',
          marginTop: '15px',
          padding: '12px 20px',
          background: '#22c55e',
          color: '#0b1220',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        + Criar Jornada
      </button>

      <h3 style={{ marginTop: '30px' }}>
        📋 Jornadas criadas
      </h3>

      {jornadas.length === 0 ? (
        <p>Ainda não existem jornadas.</p>
      ) : (
        jornadas.map((jornada) => (
          <div
            key={jornada.id}
            style={{
              background: '#172235',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '10px',
              border: '1px solid #29384d',
            }}
          >
            <strong>
              📅 {jornada.nome || `Jornada ${jornada.numero}`}
            </strong>
            
<button
  type="button"
  onClick={() => setJornadaSelecionada(jornada.id)}
  style={{
    display: 'block',
    marginTop: '12px',
    padding: '10px 15px',
    background: '#22c55e',
    color: '#0b1220',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  }}
>
  + Adicionar jogo
</button>
<div style={{ marginTop: '15px' }}>
  {jogos
    .filter((jogo) => jogo.jornada_id === jornada.id)
    .map((jogo) => (
      <div
        key={jogo.id}
        style={{
          background: '#0b1220',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '8px',
        }}
      >
        <strong>
          ⚽ {jogo.home_team} {jogo.status === 'finished'
  ? `${jogo.home_score} - ${jogo.away_score}`
  : 'vs'} {jogo.away_team}
        </strong>
<button
  type="button"
  disabled={aAtualizarBonus}
 
onClick={async () => {
  if (aAtualizarBonus) return

  const totalBonus = jogos.filter(
    (item) =>
      item.jornada_id === jornada.id &&
      item.is_bonus &&
      item.id !== jogo.id
  ).length

  if (!jogo.is_bonus && totalBonus >= 2) {
    alert('Esta jornada já tem dois jogos bónus.')
    return
  }

  setAAtualizarBonus(true)

  try {
    const { error } = await supabase
      .from('matches')
      .update({ is_bonus: !jogo.is_bonus })
      .eq('id', jogo.id)

    if (error) {
      alert('Não foi possível alterar o jogo bónus: ' + error.message)
      return
    }

    const { data, error: erroLista } = await supabase
      .from('matches')
      .select('id, jornada_id, home_team, away_team, kickoff, is_bonus, status, home_score, away_score')
      .order('kickoff', { ascending: true })

    if (erroLista) {
      alert('Alteração guardada, mas não foi possível atualizar a lista.')
      return
    }

    setJogos(data || [])
  } finally {
    setAAtualizarBonus(false)
  }
}}

onClick={async () => {
  if (aAtualizarBonus) return

  const totalBonus = jogos.filter(
    (item) =>
      item.jornada_id === jornada.id &&
      item.is_bonus &&
      item.id !== jogo.id
  ).length

  if (!jogo.is_bonus && totalBonus >= 2) {
    alert('Esta jornada já tem dois jogos bónus.')
    return
  }

  setAAtualizarBonus(true)

  try {
    const { error } = await supabase
      .from('matches')
      .update({ is_bonus: !jogo.is_bonus })
      .eq('id', jogo.id)

    if (error) {
      alert('Não foi possível alterar o jogo bónus: ' + error.message)
      return
    }

    const { data, error: erroLista } = await supabase
      .from('matches')
      .select('id, jornada_id, home_team, away_team, kickoff, is_bonus')
      .order('kickoff', { ascending: true })

    if (erroLista) {
      alert('Alteração guardada, mas não foi possível atualizar a lista.')
      return
    }

    setJogos(data || [])
  } finally {
    setAAtualizarBonus(false)
  }
}}

  style={{
    display: 'block',
    marginTop: '10px',
    padding: '8px 12px',
    background: jogo.is_bonus ? '#facc15' : '#334155',
    color: jogo.is_bonus ? '#0b1220' : 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  }}
>
  {jogo.is_bonus ? '⭐ Jogo bónus' : '☆ Marcar como bónus'}
</button>
        <p style={{ marginBottom: 0, color: '#cbd5e1' }}>
          📅 {new Date(jogo.kickoff).toLocaleString('pt-PT', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>
        <button
  type="button"
  onClick={() => {
    setJogoResultado(jogo.id)
    setGolosCasa('')
    setGolosVisitante('')
  }}
  style={{
    display: 'block',
    marginTop: '10px',
    padding: '10px 15px',
    background: '#22c55e',
    color: '#0b1220',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  }}
>
  ⚽ Registar resultado
</button>~

{jogoResultado === jogo.id && (
  <div style={{
    marginTop: '12px',
    padding: '15px',
    background: '#172235',
    borderRadius: '8px',
  }}>
    <h4>⚽ Resultado final</h4>

    <label style={{ display: 'block', marginBottom: '5px' }}>
      Golos — {jogo.home_team}
    </label>
    <input
      type="number"
      min="0"
      value={golosCasa}
      onChange={(e) => setGolosCasa(e.target.value)}
      style={{ padding: '10px', marginBottom: '12px', width: '90px' }}
    />

    <label style={{ display: 'block', marginBottom: '5px' }}>
      Golos — {jogo.away_team}
    </label>
    <input
      type="number"
      min="0"
      value={golosVisitante}
      onChange={(e) => setGolosVisitante(e.target.value)}
      style={{ padding: '10px', width: '90px' }}
    />
    
<button
  type="button"
  onClick={async () => {
    if (golosCasa === '' || golosVisitante === '') {
      alert('Preenche os golos das duas equipas.')
      return
    }

    const casa = Number(golosCasa)
    const visitante = Number(golosVisitante)

    if (
      !Number.isInteger(casa) ||
      !Number.isInteger(visitante) ||
      casa < 0 ||
      visitante < 0
    ) {
      alert('Os golos têm de ser números inteiros iguais ou superiores a zero.')
      return
    }

    if (new Date(jogo.kickoff) > new Date()) {
      alert('Este jogo ainda não começou. Não podes registar o resultado final.')
      return
    }

    const { error } = await supabase
      .from('matches')
      .update({
        home_score: casa,
        away_score: visitante,
        status: 'finished',
      })
      .eq('id', jogo.id)

    if (error) {
      alert('Erro ao guardar resultado: ' + error.message)
      return
    }

setJogos((listaAnterior) =>
  listaAnterior.map((item) =>
    item.id === jogo.id
      ? {
          ...item,
          home_score: casa,
          away_score: visitante,
          status: 'finished',
        }
      : item
  )
)

    alert('Resultado guardado com sucesso! ⚽')
    setJogoResultado(null)
    setGolosCasa('')
    setGolosVisitante('')
  }}
  style={{
    display: 'block',
    marginTop: '15px',
    padding: '12px 20px',
    background: '#22c55e',
    color: '#0b1220',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  }}
>
  💾 Guardar resultado
</button>

  </div>
)}

      </div>
    ))}
</div>
{jornadaSelecionada === jornada.id && (
  <div style={{
    marginTop: '15px',
    padding: '15px',
    background: '#0b1220',
    borderRadius: '10px',
  }}>
    <h4>⚽ Novo jogo</h4>

    <input
      type="text"
      placeholder="Equipa da casa"
      value={equipaCasa}
onChange={(e) => setEquipaCasa(e.target.value)}
      style={{
        padding: '10px',
        marginBottom: '10px',
        display: 'block',
      }}
    />

    <input
      type="text"
      placeholder="Equipa visitante"
      value={equipaVisitante}
onChange={(e) => setEquipaVisitante(e.target.value)}
      style={{
        padding: '10px',
        marginBottom: '10px',
        display: 'block',
      }}
    />
    <label style={{ display: 'block', marginBottom: '6px' }}>
  Data e hora do jogo
</label>

<input
  type="datetime-local"
  value={dataJogo}
onChange={(e) => setDataJogo(e.target.value)}
  style={{
    padding: '10px',
    marginBottom: '10px',
    display: 'block',
  }}
/>
<button
  type="button"
  onClick={async () => {
    if (!equipaCasa.trim() || !equipaVisitante.trim() || !dataJogo) {
      alert('Preenche as duas equipas e a data do jogo.')
      return
    }
    if (equipaCasa.trim().toLowerCase() === equipaVisitante.trim().toLowerCase()) {
      alert('As duas equipas têm de ser diferentes.')
      return
    }

    const dataConvertida = new Date(dataJogo)

    if (Number.isNaN(dataConvertida.getTime()) || dataConvertida <= new Date()) {
      alert('Escolhe uma data e hora futuras.')
      return
    }

    const { data: jornada, error: erroJornada } = await supabase
      .from('jornadas')
      .select('competition_id')
      .eq('id', jornadaSelecionada)
      .single()

    if (erroJornada || !jornada) {
      alert('Não foi possível encontrar a jornada.')
      return
    }

    const { error } = await supabase
      .from('matches')
      .insert({
        competition_id: jornada.competition_id,
        jornada_id: jornadaSelecionada,
        home_team: equipaCasa.trim(),
        away_team: equipaVisitante.trim(),
        kickoff: dataConvertida.toISOString(),
        is_bonus: false,
      })

    if (error) {
      alert('Erro ao guardar jogo: ' + error.message)
      return
    }
const { data: jogosAtualizados, error: erroJogos } = await supabase
  .from('matches')
  .select('id, jornada_id, home_team, away_team, kickoff, is_bonus')
  .order('kickoff', { ascending: true })

if (erroJogos) {
  console.error('Erro ao atualizar jogos:', erroJogos.message)
} else {
  setJogos(jogosAtualizados || [])
}
    alert('Jogo guardado com sucesso! ⚽')
    setEquipaCasa('')
    setEquipaVisitante('')
    setDataJogo('')
    setJornadaSelecionada(null)
  }}
  style={{
    padding: '12px 20px',
    background: '#22c55e',
    color: '#0b1220',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  }}
>
  💾 Guardar jogo
</button>
  </div>
)}

          </div>
        ))
      )}

    </div>
  )
}

export default Jornadas
