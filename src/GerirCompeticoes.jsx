
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function GerirCompeticoes() {
  const [competicoes, setCompeticoes] = useState([])
  const [epocas, setEpocas] = useState([])
  const [nomeEpoca, setNomeEpoca] = useState({})
const [aCriarEpoca, setACriarEpoca] = useState(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [carregar, setCarregar] = useState(true)
  const [guardar, setGuardar] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function carregarCompeticoes() {
    setCarregar(true)
    setErro('')

    const { data, error } = await supabase
      .from('competitions')
      .select('id,name,description,active,created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setErro(error.message)
    } else {
      setCompeticoes(data || [])
    }
const { data: dadosEpocas, error: erroEpocas } = await supabase
  .from('seasons')
  .select('id,competition_id,name,status,start_date,end_date')
  .order('created_at', { ascending: false })

if (erroEpocas) {
  setErro(erroEpocas.message)
} else {
  setEpocas(dadosEpocas || [])
}
    setCarregar(false)
  }

  useEffect(() => {
    carregarCompeticoes()
  }, [])

  async function criarCompeticao(evento) {
    evento.preventDefault()

    if (!nome.trim()) return

    setGuardar(true)
    setErro('')
    setMensagem('')

    try {
      const { data: { user }, error: erroUser } =
        await supabase.auth.getUser()

      if (erroUser || !user) {
        throw new Error('Sessão inválida.')
      }

      const { error } = await supabase
        .from('competitions')
        .insert({
          name: nome.trim(),
          description: descricao.trim(),
          created_by: user.id,
          active: false
        })

      if (error) throw error

      setNome('')
      setDescricao('')
      setMensagem('Competição criada com sucesso!')
      await carregarCompeticoes()
    } catch (error) {
      setErro(error.message)
    } finally {
      setGuardar(false)
    }
  }
async function criarEpoca(competicaoId) {
  const nome = (nomeEpoca[competicaoId] || '').trim()

  if (!nome) return

  setACriarEpoca(competicaoId)
  setErro('')
  setMensagem('')

  try {
    const { error } = await supabase
      .from('seasons')
      .insert({
        competition_id: competicaoId,
        name: nome,
        status: 'planned'
      })

    if (error) throw error

    setNomeEpoca(anterior => ({
      ...anterior,
      [competicaoId]: ''
    }))

    await carregarCompeticoes()
    setMensagem('Época criada com sucesso!')
  } catch (error) {
    setErro(error.message)
  } finally {
    setACriarEpoca(null)
  }
}
  return (
    <div style={{ color: '#f8fafc' }}>
      <h3 style={{ color: '#e8c76a' }}>
        🏆 Nova competição
      </h3>

      <form onSubmit={criarCompeticao}>
        <input
          type="text"
          placeholder="Nome da competição"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
          maxLength={100}
          style={campo}
        />

        <textarea
          placeholder="Descrição (opcional)"
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          rows={3}
          style={campo}
        />

        <button
          type="submit"
          disabled={guardar}
          style={botao}
        >
          {guardar ? 'A criar...' : '+ Criar competição'}
        </button>
      </form>

      {erro && (
        <p role="alert" style={{ color: '#fca5a5' }}>
          {erro}
        </p>
      )}

      {mensagem && (
        <p role="status" style={{ color: '#86efac' }}>
          {mensagem}
        </p>
      )}

      <h3 style={{ color: '#e8c76a', marginTop: 32 }}>
        Competições existentes
      </h3>

      {carregar ? (
        <p>A carregar competições...</p>
      ) : competicoes.length === 0 ? (
        <p>Ainda não existem competições.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {competicoes.map(competicao => (
            <div key={competicao.id} style={cartao}>
              <strong>{competicao.name}</strong>
<div style={{ marginTop: 12 }}>
  <strong style={{ color: '#e8c76a' }}>Épocas</strong>

  {epocas
    .filter(epoca => epoca.competition_id === competicao.id)
    .map(epoca => (
      <p key={epoca.id} style={{ color: '#cbd5e1' }}>
        📅 {epoca.name} — {epoca.status}
      </p>
    ))}
    <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
  <input
    type="text"
    placeholder="Nova época (ex.: 2027/28)"
    value={nomeEpoca[competicao.id] || ''}
    onChange={e => setNomeEpoca(anterior => ({
      ...anterior,
      [competicao.id]: e.target.value
    }))}
    maxLength={50}
    style={{ ...campo, flex: 1, marginBottom: 0, minWidth: 160 }}
  />

  <button
    type="button"
    onClick={() => criarEpoca(competicao.id)}
    disabled={aCriarEpoca === competicao.id}
    style={botao}
  >
    {aCriarEpoca === competicao.id ? 'A criar...' : '+ Criar época'}
  </button>
</div>
</div>
              <p style={{ color: '#94a3b8' }}>
                {competicao.description || 'Sem descrição'}
              </p>

              <span style={{
                color: competicao.active
                  ? '#86efac'
                  : '#f0d477'
              }}>
                {competicao.active
                  ? '● Ativa'
                  : '○ Inativa'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const campo = {
  display: 'block',
  width: '100%',
  padding: 13,
  marginBottom: 12,
  background: '#111722',
  border: '1px solid #594821',
  borderRadius: 10,
  color: '#f8fafc',
  fontSize: 14,
  boxSizing: 'border-box'
}

const botao = {
  background: 'linear-gradient(135deg,#f0d477,#c69c32)',
  color: '#211806',
  border: 0,
  borderRadius: 10,
  padding: '13px 20px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const cartao = {
  background: '#1b2535',
  border: '1px solid #3d3b30',
  borderRadius: 14,
  padding: 18
}
