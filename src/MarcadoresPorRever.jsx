import { useEffect, useState } from 'react'
import { supabase } from './supabase'

async function carregarMarcadores(epocaId) {
  const { data, error } = await supabase.rpc('obter_marcadores_por_rever', { p_epoca: epocaId })
  if (error) throw error
  return data
}

export default function MarcadoresPorRever({ epocaId, jogos, jornadas, ocupado, aoRever }) {
  const [marcadores, setMarcadores] = useState(null)
  const [aConsultar, setAConsultar] = useState(false)
  const [erro, setErro] = useState('')
  const [nota, setNota] = useState('')

  useEffect(() => {
    let ativo = true
    async function atualizar() {
      try {
        const lista = await carregarMarcadores(epocaId)
        if (ativo) {
          setMarcadores(lista)
          setErro('')
        }
      } catch {
        if (ativo) setErro('Não foi possível carregar os marcadores por rever.')
      }
    }
    atualizar()
    const intervalo = setInterval(atualizar, 60000)
    window.addEventListener('focus', atualizar)
    return () => {
      ativo = false
      clearInterval(intervalo)
      window.removeEventListener('focus', atualizar)
    }
  }, [epocaId])

  async function consultar() {
    setAConsultar(true)
    setErro('')
    setNota('')
    try {
      const { data, error } = await supabase.functions.invoke('sincronizar-calendario', {
        body: { epocaId, acao: 'recolher-marcadores' },
      })
      if (error || !Number.isInteger(data?.novos)) {
        const resposta = error?.context instanceof Response ? await error.context.json().catch(() => null) : null
        throw new Error(resposta?.erro || 'Não foi possível consultar a Football-Data.org.')
      }
      setMarcadores(await carregarMarcadores(epocaId))
      setNota(data.falhas
        ? 'A recolha terminou com falhas. Os jogos em falta serão consultados novamente.'
        : 'Consulta concluída.')
    } catch (e) {
      setErro(e.message || 'Não foi possível atualizar os marcadores.')
    } finally {
      setAConsultar(false)
    }
  }

  const porId = new Map(jogos.map(jogo => [jogo.id, jogo]))
  const jornadasPorId = new Map(jornadas.map(jornada => [jornada.id, jornada]))
  const porRever = (marcadores || []).flatMap(marcador => {
    const jogo = porId.get(marcador.jogo_id)
    const jornada = jornadasPorId.get(jogo?.jornada_id)
    if (!jornada || jogo.football_data_match_id !== marcador.fornecedor_id ||
      (jogo.status === 'finished' && jogo.home_score != null && jogo.away_score != null)) return []
    return [{ marcador, jogo, jornada }]
  })

  return (
    <section className="pl-jornadas-painel">
      <h3>Marcadores oficiais por rever ({porRever.length})</h3>
      <p>Os marcadores da Football-Data.org ficam aqui até confirmares a publicação de cada jogo.</p>
      <button type="button" className="pl-jornadas-botao-secundario"
        disabled={ocupado || aConsultar} onClick={consultar}>
        {aConsultar ? 'A consultar…' : 'Consultar agora'}
      </button>
      {erro && <p role="alert">{erro}</p>}
      {nota && <p role="status">{nota}</p>}
      {!marcadores && !erro && <p role="status">A carregar marcadores…</p>}
      {marcadores && !porRever.length && <p>Não há marcadores por rever.</p>}
      {porRever.map(({ jogo, jornada, marcador }) => (
        <div key={jogo.id} className="pl-jornadas-jogo pl-jornadas-marcador-revisao">
          <div>
            <span className="pl-jornadas-contagem">{jornada.nome || `Jornada ${jornada.numero}`}</span>
            <div>{jogo.home_team} <strong>{marcador.casa} – {marcador.fora}</strong> {jogo.away_team}</div>
            {marcador.houve_desempate && <small>Marcador dos 90 minutos</small>}
          </div>
          <button type="button" className="pl-jornadas-botao-secundario" disabled={ocupado}
            onClick={() => aoRever(jogo, marcador)}>Rever marcador</button>
        </div>
      ))}
    </section>
  )
}
