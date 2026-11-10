
import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const COMPETICAO_ID = '549b62f6-1f54-48db-b002-adb0e4754642'

const estilos = `
  .pl-chat {
    width: 100%;
    max-width: 950px;
    margin: 0 auto;
    color: #f8fafc;
    font-family: Arial, sans-serif;
    min-width: 0;
  }

  .pl-chat * {
    box-sizing: border-box;
  }

  .pl-chat-titulo {
    color: #e8c76a;
    font-size: clamp(23px, 4vw, 29px);
    margin: 0 0 10px;
  }

  .pl-chat-subtitulo {
    color: #94a3b8;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 24px;
  }

  .pl-chat-abas {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .pl-chat-aba {
    border: 1px solid #594821;
    background: #1b2535;
    color: #cbd5e1;
    padding: 12px 18px;
    border-radius: 11px;
    font-weight: bold;
    cursor: pointer;
    transition: .2s;
  }

  .pl-chat-aba.ativa {
    background: linear-gradient(135deg, #f0d477, #c69c32);
    color: #211806;
    border-color: #d4af37;
  }

  .pl-chat-aba:hover:not(.ativa) {
    border-color: #d4af37;
    color: #f0d477;
  }

  .pl-chat-seletor {
    background: #151e2c;
    border: 1px solid #594821;
    border-radius: 14px;
    padding: 18px;
    margin-bottom: 20px;
  }

  .pl-chat-seletor label {
    display: block;
    color: #e8c76a;
    font-weight: bold;
    font-size: 13px;
    margin-bottom: 10px;
  }

  .pl-chat-seletor select {
    width: 100%;
    padding: 13px;
    border: 1px solid #475569;
    background: #0d1523;
    color: #f8fafc;
    border-radius: 9px;
    font-size: 14px;
  }

  .pl-chat-painel {
    background: #111827;
    border: 1px solid #594821;
    border-radius: 18px;
    overflow: hidden;
  }

  .pl-chat-cabecalho {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 20px;
    background: linear-gradient(135deg, #222d3e, #171f2d);
    border-bottom: 1px solid #594821;
  }

  .pl-chat-cabecalho-icone {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 43px;
    height: 43px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #d4af3720;
    border: 1px solid #d4af3750;
    font-size: 22px;
  }

  .pl-chat-cabecalho-nome {
    color: #f0d477;
    font-size: 16px;
    font-weight: bold;
    overflow-wrap: anywhere;
  }

  .pl-chat-cabecalho-descricao {
    color: #94a3b8;
    font-size: 12px;
    margin-top: 5px;
  }

  .pl-chat-mensagens {
    height: 420px;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 13px;
    background: #0c1422;
  }

  .pl-chat-mensagem {
    display: flex;
    justify-content: flex-start;
  }

  .pl-chat-mensagem.minha {
    justify-content: flex-end;
  }

  .pl-chat-balao {
    max-width: 78%;
    min-width: 100px;
    background: #1b2535;
    border: 1px solid #334155;
    border-radius: 15px 15px 15px 4px;
    padding: 12px 15px;
    overflow-wrap: anywhere;
  }

  .pl-chat-mensagem.minha .pl-chat-balao {
    background: linear-gradient(135deg, #3c321d, #292719);
    border-color: #8f722e;
    border-radius: 15px 15px 4px 15px;
  }

  .pl-chat-autor {
    color: #e8c76a;
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 7px;
  }

  .pl-chat-texto {
    color: #f1f5f9;
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .pl-chat-data {
    color: #94a3b8;
    font-size: 10px;
    margin-top: 9px;
    text-align: right;
  }

  .pl-chat-vazio {
    margin: auto;
    text-align: center;
    color: #94a3b8;
    font-size: 14px;
    line-height: 1.7;
    padding: 25px;
  }

  .pl-chat-vazio-icone {
    font-size: 38px;
    margin-bottom: 13px;
  }

  .pl-chat-formulario {
    display: flex;
    gap: 10px;
    padding: 16px;
    background: #172235;
    border-top: 1px solid #334155;
  }

  .pl-chat-input {
    flex: 1;
    min-width: 0;
    padding: 13px 15px;
    border: 1px solid #475569;
    border-radius: 10px;
    background: #0d1523;
    color: #f8fafc;
    font-size: 14px;
    outline: none;
  }

  .pl-chat-input:focus {
    border-color: #d4af37;
  }

  .pl-chat-input::placeholder {
    color: #64748b;
  }

  .pl-chat-enviar {
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #f0d477, #c69c32);
    color: #211806;
    padding: 12px 20px;
    font-weight: bold;
    cursor: pointer;
    white-space: nowrap;
  }

  .pl-chat-enviar:hover:not(:disabled) {
    filter: brightness(1.08);
  }

  .pl-chat-enviar:disabled {
    opacity: .45;
    cursor: not-allowed;
  }

  .pl-chat-rodape {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    padding: 10px 16px;
    background: #131c2b;
    color: #94a3b8;
    font-size: 11px;
  }

  .pl-chat-erro {
    padding: 14px;
    margin-bottom: 15px;
    border-radius: 10px;
    border: 1px solid #ef444460;
    background: #ef444410;
    color: #fca5a5;
    font-size: 13px;
  }

  @media (max-width: 600px) {
    .pl-chat-abas {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .pl-chat-aba {
      padding: 12px 8px;
      font-size: 12px;
    }

    .pl-chat-mensagens {
      height: 380px;
      padding: 13px;
    }

    .pl-chat-balao {
      max-width: 90%;
      padding: 11px 12px;
    }

    .pl-chat-formulario {
      padding: 10px;
      gap: 7px;
    }

    .pl-chat-input {
      padding: 12px 10px;
      font-size: 13px;
    }

    .pl-chat-enviar {
      padding: 12px;
      font-size: 12px;
    }

    .pl-chat-cabecalho {
      padding: 15px;
    }
  }
`

function Chat() {
  const [tipoChat, setTipoChat] = useState('geral')
  const [jogos, setJogos] = useState([])
  const [jogoSelecionado, setJogoSelecionado] = useState('')
  const [mensagens, setMensagens] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [utilizadorId, setUtilizadorId] = useState(null)
  const [aCarregar, setACarregar] = useState(false)
  const [aEnviar, setAEnviar] = useState(false)
  const [erro, setErro] = useState('')

  const fimMensagensRef = useRef(null)
  const conversaRef = useRef(null)

  const matchId =
    tipoChat === 'geral'
      ? null
      : jogoSelecionado || null

  useEffect(() => {
    let ativo = true

    async function identificarUtilizador() {
      const { data } = await supabase.auth.getUser()

      if (ativo) {
        setUtilizadorId(data?.user?.id || null)
      }
    }

    identificarUtilizador()

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (tipoChat !== 'jogos') return

    let ativo = true

    async function carregarJogos() {
      const { data: epoca, error: erroEpoca } = await supabase
        .from('seasons')
        .select('id')
        .eq('competition_id', COMPETICAO_ID)
        .eq('status', 'active')
        .maybeSingle()

      if (!ativo) return

      if (erroEpoca) {
        setErro(erroEpoca.message)
        return
      }

      if (!epoca) {
        setJogos([])
        setErro('Não existe uma época ativa.')
        return
      }

      const { data, error } = await supabase
        .from('matches')
        .select('id, home_team, away_team, kickoff')
        .eq('competition_id', COMPETICAO_ID)
        .eq('season_id', epoca.id)
        .order('kickoff', { ascending: true })

      if (!ativo) return

      if (error) {
        setErro(error.message)
      } else {
        setErro('')
        setJogos(data || [])
      }
    }

    carregarJogos()

    return () => {
      ativo = false
    }
  }, [tipoChat])

  useEffect(() => {
    if (tipoChat === 'jogos' && !matchId) {
      setMensagens([])
      setACarregar(false)
      return
    }

    let ativo = true

    async function carregar(silencioso = false) {
      if (!silencioso) {
        setACarregar(true)
      }

      const { data, error } = await supabase.rpc(
        'obter_mensagens_chat',
        {
          p_competition_id: COMPETICAO_ID,
          p_match_id: matchId
        }
      )

      if (!ativo) return

      if (error) {
        setErro(error.message)
      } else {
        setErro('')
        setMensagens(data || [])
      }

      if (!silencioso) {
        setACarregar(false)
      }
    }

    setMensagens([])
    carregar()

    const intervalo = setInterval(
      () => carregar(true),
      10000
    )

    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [tipoChat, matchId])

  useEffect(() => {
    const elemento = conversaRef.current

    if (!elemento) return

    const distanciaAoFim =
      elemento.scrollHeight -
      elemento.scrollTop -
      elemento.clientHeight

    if (distanciaAoFim < 130 || mensagens.length <= 3) {
      fimMensagensRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [mensagens])

  async function enviarMensagem(evento) {
    evento.preventDefault()

    const texto = mensagem.trim()

    if (!texto || aEnviar) return
    if (tipoChat === 'jogos' && !matchId) return

    if (texto.length > 1000) {
      setErro('A mensagem não pode ultrapassar 1000 caracteres.')
      return
    }

    setAEnviar(true)
    setErro('')

    try {
      const { error } = await supabase.rpc(
        'enviar_mensagem_chat',
        {
          p_competition_id: COMPETICAO_ID,
          p_mensagem: texto,
          p_match_id: matchId
        }
      )

      if (error) {
        setErro('Não foi possível enviar: ' + error.message)
        return
      }

      setMensagem('')

      const { data, error: erroAtualizacao } =
        await supabase.rpc(
          'obter_mensagens_chat',
          {
            p_competition_id: COMPETICAO_ID,
            p_match_id: matchId
          }
        )

      if (!erroAtualizacao) {
        setMensagens(data || [])
      } else {
        setErro(
          'Mensagem enviada, mas não foi possível atualizar a conversa.'
        )
      }
    } catch {
      setErro('Ocorreu um erro ao enviar a mensagem.')
    } finally {
      setAEnviar(false)
    }
  }

  function mudarChat(tipo) {
    setTipoChat(tipo)
    setMensagem('')
    setErro('')
  }

  const jogoAtual = jogos.find(
    jogo => jogo.id === jogoSelecionado
  )

  const tituloConversa =
    tipoChat === 'geral'
      ? 'Chat Geral'
      : jogoAtual
        ? `${jogoAtual.home_team} vs ${jogoAtual.away_team}`
        : 'Chat por Jogo'

  function mensagemMinha(msg) {
    const idMensagem =
      msg.user_id || msg.sender_id || msg.participant_id

    return Boolean(
      utilizadorId &&
      idMensagem &&
      idMensagem === utilizadorId
    )
  }

  function formatarData(data) {
    if (!data) return ''

    const dataFormatada = new Date(data)

    if (Number.isNaN(dataFormatada.getTime())) {
      return ''
    }

    return dataFormatada.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="pl-chat">
      <style>{estilos}</style>

      <h2 className="pl-chat-titulo">
        💬 Chat Predict League
      </h2>

      <p className="pl-chat-subtitulo">
        Partilha opiniões, comenta os jogos
        e conversa com os outros participantes.
      </p>

      <div className="pl-chat-abas">
        <button
          type="button"
          className={
            `pl-chat-aba ${tipoChat === 'geral' ? 'ativa' : ''}`
          }
          onClick={() => mudarChat('geral')}
        >
          🌍 Chat Geral
        </button>

        <button
          type="button"
          className={
            `pl-chat-aba ${tipoChat === 'jogos' ? 'ativa' : ''}`
          }
          onClick={() => mudarChat('jogos')}
        >
          ⚽ Chat por Jogo
        </button>
      </div>

      {tipoChat === 'jogos' && (
        <div className="pl-chat-seletor">
          <label htmlFor="pl-chat-jogo">
            ⚽ Seleciona um jogo
          </label>

          <select
            id="pl-chat-jogo"
            value={jogoSelecionado}
            onChange={e => {
              setJogoSelecionado(e.target.value)
              setMensagem('')
              setErro('')
            }}
          >
            <option value="">Selecionar jogo...</option>

            {jogos.map(jogo => (
              <option key={jogo.id} value={jogo.id}>
                {jogo.home_team} vs {jogo.away_team}
                {' — '}
                {new Date(jogo.kickoff).toLocaleDateString('pt-PT')}
              </option>
            ))}
          </select>
        </div>
      )}

      {erro && (
        <div className="pl-chat-erro" role="alert">
          {erro}
        </div>
      )}

      <section className="pl-chat-painel">
        <div className="pl-chat-cabecalho">
          <div className="pl-chat-cabecalho-icone">
            {tipoChat === 'geral' ? '🌍' : '⚽'}
          </div>

          <div>
            <div className="pl-chat-cabecalho-nome">
              {tituloConversa}
            </div>

            <div className="pl-chat-cabecalho-descricao">
              {tipoChat === 'geral'
                ? 'Conversa entre participantes'
                : jogoAtual
                  ? 'Discussão sobre o jogo'
                  : 'Escolhe um jogo para começar'}
            </div>
          </div>
        </div>

        <div
          className="pl-chat-mensagens"
          ref={conversaRef}
          role="log"
          aria-label="Mensagens da conversa"
        >
          {tipoChat === 'jogos' && !matchId ? (
            <div className="pl-chat-vazio">
              <div className="pl-chat-vazio-icone">⚽</div>
              Seleciona um jogo para abrir a conversa.
            </div>
          ) : aCarregar ? (
            <div className="pl-chat-vazio">
              A carregar mensagens...
            </div>
          ) : mensagens.length === 0 ? (
            <div className="pl-chat-vazio">
              <div className="pl-chat-vazio-icone">💬</div>
              Ainda não existem mensagens nesta conversa.
              <div>Sê o primeiro a escrever!</div>
            </div>
          ) : (
            mensagens.map(msg => {
              const minha = mensagemMinha(msg)

              return (
                <div
                  key={msg.id}
                  className={
                    `pl-chat-mensagem ${minha ? 'minha' : ''}`
                  }
                >
                  <div className="pl-chat-balao">
                    <div className="pl-chat-autor">
                      {minha
                        ? 'Tu'
                        : `👤 ${msg.jogador || 'Participante'}`}
                    </div>

                    <div className="pl-chat-texto">
                      {msg.mensagem}
                    </div>

                    <div className="pl-chat-data">
                      {formatarData(msg.criada_em)}
                    </div>
                  </div>
                </div>
              )
            })
          )}

          <div ref={fimMensagensRef} />
        </div>

        <form
          className="pl-chat-formulario"
          onSubmit={enviarMensagem}
        >
          <input
            className="pl-chat-input"
            type="text"
            placeholder="Escreve uma mensagem..."
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            maxLength={1000}
            disabled={
              aEnviar ||
              (tipoChat === 'jogos' && !matchId)
            }
          />

          <button
            className="pl-chat-enviar"
            type="submit"
            disabled={
              aEnviar ||
              !mensagem.trim() ||
              (tipoChat === 'jogos' && !matchId)
            }
          >
            {aEnviar ? 'A enviar...' : '➤ Enviar'}
          </button>
        </form>

        <div className="pl-chat-rodape">
          <span>💬 Predict League</span>
          <span>{mensagem.length}/1000 caracteres</span>
        </div>
      </section>
    </div>
  )
}

export default Chat
