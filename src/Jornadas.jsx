 
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const card = { background: '#172235', border: '1px solid #29384d', borderRadius: 10, padding: 16, marginBottom: 12 }
const input = { padding: 10, borderRadius: 8, margin: '6px 8px 6px 0', maxWidth: '100%' }
const button = { padding: '10px 14px', border: 0, borderRadius: 8, background: '#22c55e', color: '#0b1220', cursor: 'pointer', margin: '6px 8px 6px 0', fontWeight: 'bold' }

export default function Jornadas() {
  const [epoca, setEpoca] = useState(null)
  const [jornadas, setJornadas] = useState([])
  const [jogos, setJogos] = useState([])
  const [nome, setNome] = useState('')
  const [selecionada, setSelecionada] = useState(null)
  const [casa, setCasa] = useState('')
  const [fora, setFora] = useState('')
  const [dataJogo, setDataJogo] = useState('')
  const [resultadoId, setResultadoId] = useState(null)
  const [golosCasa, setGolosCasa] = useState('')
  const [golosFora, setGolosFora] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [aCarregar, setACarregar] = useState(true)

  async function atualizarListas(id) {
    const [j, m] = await Promise.all([
      supabase.from('jornadas').select('id, numero, nome, season_id').eq('season_id', id).order('numero'),
      supabase.from('matches').select('id, jornada_id, season_id, home_team, away_team, kickoff, is_bonus, status, home_score, away_score').eq('season_id', id).order('kickoff')
    ])

    if (j.error) throw j.error
    if (m.error) throw m.error

    setJornadas(j.data || [])
    
    setJogos(m.data || [])
  }

  useEffect(() => {
    let ativo = true

    async function iniciar() {
      try {
        const { data, error } = await supabase.from('seasons')
          .select('id, name, competition_id, competitions!inner(name)')
          .eq('status', 'active').eq('competitions.name', 'Predict League')
        if (error) throw error
        if (!ativo) return
        if (data?.length !== 1) throw new Error('Deve existir exatamente uma época ativa na Predict League.')
        setEpoca(data[0])
        await atualizarListas(data[0].id)
      } catch (e) {
        if (ativo) setErro(e.message)
      } finally {
        if (ativo) setACarregar(false)
      }
    }
    iniciar()
    return () => { ativo = false }
  }, [])

  async function executar(acao, mensagem) {
    if (ocupado || !epoca) return
    setOcupado(true)
    try {
      await acao()
      await atualizarListas(epoca.id)
      if (mensagem) alert(mensagem)
    } catch (e) {
      alert('Não foi possível concluir: ' + e.message)
    } finally {
      setOcupado(false)
    }
  }

  if (aCarregar) return <p style={{ color: 'white', padding: 25 }}>A carregar jornadas...</p>
  if (erro || !epoca) return <p style={{ color: '#f87171', padding: 25 }}>{erro || 'Não existe época ativa.'}</p>

  return (
    <div style={{ padding: 25, color: 'white' }}>
      <h2>📅 Gerir Jornadas — {epoca.name}</h2>
      <p style={{ color: '#94a3b8' }}>Apenas jornadas e jogos da época ativa.</p>
      <input style={input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Jornada 1" />
      <button style={button} disabled={ocupado} onClick={() => executar(async () => {
        const numero = Number(nome.trim().match(/\d+$/)?.[0])
        if (!Number.isInteger(numero) || numero < 1) throw new Error('Escreve um nome como Jornada 1.')
        if (jornadas.some(j => j.numero === numero)) throw new Error('Já existe uma jornada com esse número nesta época.')
        const { error } = await supabase.from('jornadas').insert({
          competition_id: epoca.competition_id, season_id: epoca.id, numero, nome: nome.trim()
        })
        if (error) throw error
        setNome('')
      }, 'Jornada criada!')}>+ Criar Jornada</button>

      <h3>📋 Jornadas criadas</h3>
      {jornadas.length === 0 && <p>Ainda não existem jornadas nesta época.</p>}
      {jornadas.map(jornada => (
        <div key={jornada.id} style={card}>
          <h3>📅 {jornada.nome || `Jornada ${jornada.numero}`}</h3>
          <button style={button} onClick={() => setSelecionada(selecionada === jornada.id ? null : jornada.id)}>
            {selecionada === jornada.id ? 'Cancelar' : '+ Adicionar jogo'}
          </button>
          {jogos.filter(j => j.jornada_id === jornada.id).map(jogo => (
            <div key={jogo.id} style={{ ...card, background: '#0b1220' }}>
              <strong>⚽ {jogo.home_team} {jogo.status === 'finished' ? `${jogo.home_score} - ${jogo.away_score}` : 'vs'} {jogo.away_team}</strong>
              <p>📅 {new Date(jogo.kickoff).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}</p>
              <button style={{ ...button, background: jogo.is_bonus ? '#facc15' : '#334155', color: jogo.is_bonus ? '#0b1220' : 'white' }}
                disabled={ocupado}
                onClick={() => executar(async () => {
                  const outrosBonus = jogos.filter(j => j.jornada_id === jornada.id && j.is_bonus && j.id !== jogo.id).length
                  if (!jogo.is_bonus && outrosBonus >= 2) throw new Error('Esta jornada já tem dois jogos bónus.')
                  const { error } = await supabase.from('matches').update({ is_bonus: !jogo.is_bonus }).eq('id', jogo.id).eq('season_id', epoca.id)
                  if (error) throw error
                })}>
                {jogo.is_bonus ? '⭐ Jogo bónus' : '☆ Marcar como bónus'}
              </button>
              <button style={button} onClick={() => {
                setResultadoId(resultadoId === jogo.id ? null : jogo.id)
                setGolosCasa(jogo.home_score == null ? '' : String(jogo.home_score))
                setGolosFora(jogo.away_score == null ? '' : String(jogo.away_score))
              }}>⚽ Registar resultado</button>
              {resultadoId === jogo.id && (
                <div style={card}>
                  <label>Golos — {jogo.home_team}: </label>
                  <input style={{ ...input, width: 75 }} type="number" min="0" value={golosCasa} onChange={e => setGolosCasa(e.target.value)} />
                  <label>Golos — {jogo.away_team}: </label>
                  <input style={{ ...input, width: 75 }} type="number" min="0" value={golosFora} onChange={e => setGolosFora(e.target.value)} />
                  <button style={button} disabled={ocupado} onClick={() => executar(async () => {
                    const a = Number(golosCasa), b = Number(golosFora)
                    if (golosCasa === '' || golosFora === '' || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0)
                      throw new Error('Indica dois resultados inteiros não negativos.')
                    if (new Date(jogo.kickoff) > new Date()) throw new Error('O jogo ainda não começou.')
                    const { error } = await supabase.from('matches').update({
                      home_score: a, away_score: b, status: 'finished'
                    }).eq('id', jogo.id).eq('season_id', epoca.id)
                    if (error) throw error
                    setResultadoId(null)
                  }, 'Resultado guardado!')}>💾 Guardar resultado</button>
                </div>
              )}
            </div>
          ))}
          {selecionada === jornada.id && (
            <div style={{ ...card, background: '#0b1220' }}>
              <h4>⚽ Novo jogo</h4>
              <input style={input} placeholder="Equipa da casa" value={casa} onChange={e => setCasa(e.target.value)} />
              <input style={input} placeholder="Equipa visitante" value={fora} onChange={e => setFora(e.target.value)} />
              <label>Data e hora: </label>
              <input style={input} type="datetime-local" value={dataJogo} onChange={e => setDataJogo(e.target.value)} />
              <button style={button} disabled={ocupado} onClick={() => executar(async () => {
                if (!casa.trim() || !fora.trim() || !dataJogo) throw new Error('Preenche as equipas e a data.')
                if (casa.trim().toLowerCase() === fora.trim().toLowerCase()) throw new Error('As equipas têm de ser diferentes.')
                const data = new Date(dataJogo)
                if (Number.isNaN(data.getTime()) || data <= new Date()) throw new Error('Escolhe uma data futura.')
                const { error } = await supabase.from('matches').insert({
                  competition_id: epoca.competition_id, season_id: epoca.id, jornada_id: jornada.id,
                  home_team: casa.trim(), away_team: fora.trim(), kickoff: data.toISOString(), is_bonus: false
                })
                if (error) throw error
                setCasa(''); setFora(''); setDataJogo(''); setSelecionada(null)
              }, 'Jogo criado!')}>💾 Guardar jogo</button>
            </div>
          )}
        </div>
              ))}
    </div>
  )
}