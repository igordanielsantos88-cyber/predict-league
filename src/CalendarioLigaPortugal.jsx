import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const dataHora = new Intl.DateTimeFormat('pt-PT', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Lisbon',
})
const rotulos = { criado: 'Novo jogo', associado: 'Jogo existente', atualizado: 'Hora atualizada', rever: 'Rever' }

function anoDaEpoca() {
  const hoje = new Date()
  return String(hoje.getFullYear() - (hoje.getMonth() < 6 ? 1 : 0))
}

export default function CalendarioLigaPortugal({ epocaId, atualizarJogos }) {
  const [config, setConfig] = useState(undefined)
  const [ano, setAno] = useState(anoDaEpoca)
  const [desvio, setDesvio] = useState('0')
  const [automatico, setAutomatico] = useState(false)
  const [relatorio, setRelatorio] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    const pedido = new AbortController()
    async function carregar() {
      const { data, error } = await supabase.rpc('obter_config_calendario', {
        p_epoca: epocaId,
      }).abortSignal(pedido.signal)
      if (pedido.signal.aborted) return
      if (error) {
        setConfig(null)
        setMensagem({ erro: true, texto: 'Não foi possível consultar a configuração do calendário.' })
        return
      }
      setConfig(data)
      if (data) {
        setAno(String(data.season_year))
        setDesvio(String(data.round_offset))
        setAutomatico(data.enabled)
        setRelatorio(data.last_report)
      }
    }
    void carregar()
    return () => pedido.abort()
  }, [epocaId])

  async function guardar(evento) {
    evento.preventDefault()
    if (ocupado) return
    setOcupado(true)
    setMensagem(null)
    try {
      const { data, error } = await supabase.rpc('guardar_config_calendario', {
        p_epoca: epocaId, p_ano: Number(ano), p_desvio: Number(desvio), p_ativo: automatico,
      })
      if (error || !data) throw new Error(error?.message || 'Não foi possível guardar a configuração.')
      setConfig(data)
      setRelatorio(data.last_report)
      setMensagem({ texto: 'Configuração guardada.' })
    } catch (error) {
      setMensagem({ erro: true, texto: error.message })
    } finally {
      setOcupado(false)
    }
  }

  async function sincronizar(previa) {
    if (ocupado || !config) return
    setOcupado(true)
    setMensagem(null)
    try {
      const { data, error } = await supabase.functions.invoke('sincronizar-calendario', {
        body: { epocaId, previa },
      })
      if (error || !Array.isArray(data?.jogos)) {
        const resposta = error?.context instanceof Response ? await error.context.json().catch(() => null) : null
        throw new Error(resposta?.erro || 'Não foi possível consultar o calendário oficial.')
      }
      setRelatorio(data)
      if (!previa) {
        setConfig(anterior => ({ ...anterior, last_sync_at: data.sincronizadoEm, last_report: data }))
        await atualizarJogos()
      }
    } catch (error) {
      setMensagem({ erro: true, texto: error.message })
    } finally {
      setOcupado(false)
    }
  }

  const alterado = !config || config.season_year !== Number(ano) ||
    config.round_offset !== Number(desvio) || config.enabled !== automatico

  return (
    <details className="pl-jornadas-painel">
      <summary>Calendário automático da Liga Portugal</summary>
      <p>Importa jogos com hora confirmada nos próximos 45 dias. Os resultados continuam a ser publicados por ti.</p>
      {config === undefined ? <p role="status">A carregar configuração…</p> : (
        <form onSubmit={guardar}>
          <div className="pl-jornadas-campos">
            <label>Ano de início da época oficial{' '}
              <input type="number" className="pl-jornadas-input" min="2000" max="2100" required
                value={ano} disabled={ocupado} onChange={e => setAno(e.target.value)} /></label>
            <label>Desvio do número da jornada{' '}
              <input type="number" className="pl-jornadas-input" min="-33" max="100" required
                value={desvio} disabled={ocupado} onChange={e => setDesvio(e.target.value)} /></label>
            <label><input type="checkbox" checked={automatico} disabled={ocupado}
              onChange={e => setAutomatico(e.target.checked)} /> Sincronizar de hora a hora</label>
          </div>
          <p>Com desvio 0, a jornada oficial 12 entra na Jornada 12 da app.</p>
          <div className="pl-jornadas-acoes">
            <button type="submit" className="pl-jornadas-botao-secundario" disabled={ocupado || !alterado}>
              Guardar configuração
            </button>
            <button type="button" className="pl-jornadas-botao-secundario" disabled={ocupado || alterado}
              onClick={() => sincronizar(true)}>Consultar prévia</button>
            <button type="button" className="pl-jornadas-botao" disabled={ocupado || alterado}
              onClick={() => sincronizar(false)}>Sincronizar agora</button>
          </div>
        </form>
      )}
      {ocupado && <p role="status">A processar calendário…</p>}
      {mensagem && <p role={mensagem.erro ? 'alert' : 'status'}>{mensagem.texto}</p>}
      {config?.last_sync_at && <p>Última sincronização concluída a {dataHora.format(new Date(config.last_sync_at))}.</p>}
      {relatorio && (
        <section aria-label={relatorio.previa ? 'Prévia da sincronização' : 'Alterações do calendário'}>
          <h4>{relatorio.previa ? 'Prévia da sincronização' : 'Alterações do calendário'}</h4>
          {relatorio.jogos.length ? <ul>
            {relatorio.jogos.map(jogo => <li key={jogo.id}>
              <strong>{rotulos[jogo.acao]} · {jogo.casa} vs {jogo.fora}</strong>
              {' · '}Jornada {jogo.jornada}
              {jogo.hora && ` · ${dataHora.format(new Date(jogo.hora))}`}
              {jogo.motivo && ` · ${jogo.motivo}`}
            </li>)}
          </ul> : <p>Sem alterações a aplicar.</p>}
        </section>
      )}
    </details>
  )
}
