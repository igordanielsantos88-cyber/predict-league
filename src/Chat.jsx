import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const COMPETICAO_ID = '549b62f6-1f54-48db-b002-adb0e4754642'

const cores = {
  fundo: '#0b1220',
  painel: '#172235',
  interior: '#0f172a',
  ouro: '#c9a84c',
  cinzento: '#94a3b8',
  borda: '#29384d'
}

function Chat() {
  const [tipoChat, setTipoChat] = useState('geral')
  const [jogos, setJogos] = useState([])
  const [jogoId, setJogoId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [mensagens, setMensagens] = useState([])
  const [aCarregar, setACarregar] = useState(false)
  const [aCarregarJogos, setACarregarJogos] = useState(false)
  const [aEnviar, setAEnviar] = useState(false)
  const [erro, setErro] = useState('')
  const [erroJogos, setErroJogos] = useState('')
  const [atualizacao, setAtualizacao] = useState(0)

  const jogoSelecionado = jogos.find((jogo) => jogo.id === jogoId)
  const podeConversar = tipoChat === 'geral' || Boolean(jogoId)

  useEffect(() => {
    if (tipoChat !== 'jogos') return
    let ativo = true

    async function carregarJogos() {
      setACarregarJogos(true)
      setErroJogos('')
      try {
        const { data, error } = await supabase.rpc('listar_jogos_chat', {
          p_competition_id: COMPETICAO_ID
        })
        if (!ativo) return
        if (error) {
          setErroJogos(error.message)
          setJogos([])
        } else {
          setJogos(data || [])
        }
      } catch {
        if (ativo) setErroJogos('Não foi possível carregar os jogos.')
      } finally {
        if (ativo) setACarregarJogos(false)
      }
    }

    carregarJogos()
    return () => { ativo = false }
  }, [tipoChat])

  useEffect(() => {
    if (tipoChat === 'jogos' && !jogoId) {
      setMensagens([])
      setErro('')
      setACarregar(false)
      return
    }

    let ativo = true
    const matchId = tipoChat === 'geral' ? null : jogoId

    async function carregarMensagens() {
      setACarregar(true)
      setErro('')
      try {
        const { data, error } = await supabase.rpc('obter_mensagens_chat', {
          p_competition_id: COMPETICAO_ID,
          p_match_id: matchId
        })
        if (!ativo) return
        if (error) {
          setErro(error.message)
          setMensagens([])
        } else {
          setMensagens(data || [])
        }
      } catch {
        if (ativo) {
          setErro('Não foi possível carregar as mensagens.')
          setMensagens([])
        }
      } finally {
        if (ativo) setACarregar(false)
      }
    }

    carregarMensagens()
    return () => { ativo = false }
  }, [tipoChat, jogoId, atualizacao])

  async function enviarMensagem(evento) {
    evento.preventDefault()
    const texto = mensagem.trim()
    if (!texto || aEnviar || !podeConversar) return
    if (texto.length > 1000) {
      setErro('A mensagem não pode ultrapassar 1000 caracteres.')
      return
    }

    setAEnviar(true)
    setErro('')
    try {
      const { error } = await supabase.rpc('enviar_mensagem_chat', {
        p_competition_id: COMPETICAO_ID,
        p_mensagem: texto,
        p_match_id: tipoChat === 'geral' ? null : jogoId
      })
      if (error) {
        setErro('Não foi possível enviar: ' + error.message)
        return
      }
      setMensagem('')
      setAtualizacao((valor) => valor + 1)
    } catch {
      setErro('Ocorreu um erro ao enviar a mensagem.')
    } finally {
      setAEnviar(false)
    }
  }

  function mudarTipo(novoTipo) {
    setTipoChat(novoTipo)
    setMensagem('')
    setErro('')
  }

  return (
    <div style={{ background: cores.fundo, color: 'white', minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ color: cores.ouro }}>💬 Chat Predict League</h1>
      <p style={{ color: cores.cinzento }}>Conversa com os outros participantes da competição.</p>

      <div style={{ display: 'flex', gap: '10px', marginTop: '25px', marginBottom: '25px', flexWrap: 'wrap' }}>
        {[
          { id: 'geral', nome: '🌍 Chat geral' },
          { id: 'jogos', nome: '⚽ Chat por jogo' }
        ].map((tipo) => (
          <button
            key={tipo.id}
            type="button"
            onClick={() => mudarTipo(tipo.id)}
            style={{
              padding: '12px 20px',
              background: tipoChat === tipo.id ? cores.ouro : cores.painel,
              color: tipoChat === tipo.id ? cores.fundo : 'white',
              border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            {tipo.nome}
          </button>
        ))}
      </div>

      <div style={{ background: cores.painel, padding: '18px', borderRadius: '12px', border: `1px solid ${cores.borda}` }}>
        <h3>{tipoChat === 'geral' ? '🌍 Conversa geral' : '⚽ Conversas dos jogos'}</h3>

        {tipoChat === 'jogos' && (
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="jogo-chat" style={{ display: 'block', color: cores.cinzento, marginBottom: '8px' }}>
              Escolhe um jogo
            </label>
            <select
              id="jogo-chat"
              value={jogoId}
              onChange={(evento) => {
                setJogoId(evento.target.value)
                setMensagem('')
                setErro('')
              }}
              style={{ width: '100%', padding: '12px', background: cores.interior, color: 'white', border: '1px solid #334155', borderRadius: '8px' }}
            >
              <option value="">Seleciona uma partida...</option>
              {jogos.map((jogo) => (
                <option key={jogo.id} value={jogo.id}>
                  {jogo.home_team} vs {jogo.away_team} — {new Date(jogo.kickoff).toLocaleString('pt-PT')}
                </option>
              ))}
            </select>
            {aCarregarJogos && <p style={{ color: cores.cinzento }}>A carregar jogos...</p>}
            {erroJogos && <p style={{ color: '#f87171' }}>Erro ao carregar jogos: {erroJogos}</p>}
            {!aCarregarJogos && !erroJogos && jogos.length === 0 && (
              <p style={{ color: cores.cinzento }}>Não há jogos disponíveis para esta competição.</p>
            )}
            {jogoSelecionado && (
              <p style={{ color: cores.ouro }}>
                {jogoSelecionado.home_team} vs {jogoSelecionado.away_team}
              </p>
            )}
          </div>
        )}

        {podeConversar ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setAtualizacao((valor) => valor + 1)}
                disabled={aCarregar}
                style={{ padding: '8px 12px', borderRadius: '8px', background: cores.interior, color: 'white', border: '1px solid #334155', cursor: 'pointer' }}
              >
                🔄 Atualizar
              </button>
            </div>
            <div style={{ minHeight: '250px', padding: '15px', background: cores.interior, borderRadius: '10px', marginBottom: '20px' }}>
              {aCarregar && <p style={{ color: cores.cinzento }}>A carregar mensagens...</p>}
              {erro && <p style={{ color: '#f87171' }}>Erro: {erro}</p>}
              {!aCarregar && !erro && mensagens.length === 0 && (
                <p style={{ color: cores.cinzento }}>Ainda não existem mensagens. Sê o primeiro a escrever!</p>
              )}
              {!aCarregar && mensagens.map((msg) => (
                <div key={msg.id} style={{ padding: '12px', marginBottom: '10px', background: cores.painel, borderRadius: '10px', border: `1px solid ${cores.borda}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <strong style={{ color: cores.ouro }}>👤 {msg.jogador}</strong>
                    <small style={{ color: cores.cinzento }}>{new Date(msg.criada_em).toLocaleString('pt-PT')}</small>
                  </div>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{msg.mensagem}</p>
                </div>
              ))}
            </div>

            <form onSubmit={enviarMensagem} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Escreve uma mensagem..."
                value={mensagem}
                onChange={(evento) => setMensagem(evento.target.value)}
                maxLength={1000}
                style={{ flex: 1, minWidth: '180px', padding: '12px', background: cores.interior, color: 'white', border: '1px solid #334155', borderRadius: '8px' }}
              />
              <button
                type="submit"
                disabled={aEnviar || !mensagem.trim()}
                style={{ padding: '12px 20px', background: cores.ouro, color: cores.fundo, border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: aEnviar ? 'wait' : 'pointer', opacity: aEnviar || !mensagem.trim() ? 0.5 : 1 }}
              >
                {aEnviar ? '⏳ A enviar...' : '📤 Enviar'}
              </button>
            </form>
          </>
        ) : (
          <p style={{ color: cores.cinzento }}>Seleciona um jogo para veres e enviares mensagens.</p>
        )}
      </div>
    </div>
  )
}

export default Chat
