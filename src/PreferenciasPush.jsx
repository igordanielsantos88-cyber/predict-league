import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const categorias = [
  ['new_matches', 'Novos jogos'],
  ['reminders', 'Lembretes de prognósticos'],
  ['results', 'Resultados publicados'],
]

export default function PreferenciasPush() {
  const [estado, setEstado] = useState(null)
  const [preferencias, setPreferencias] = useState(null)
  const [aGuardar, setAGuardar] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const pedido = new AbortController()
    async function carregar() {
      const { data, error } = await supabase.rpc('obter_preferencias_push').abortSignal(pedido.signal)
      if (pedido.signal.aborted) return
      if (error || !data?.conta || categorias.some(([id]) => typeof data[id] !== 'boolean')) {
        setEstado({ erro: 'Não foi possível carregar as preferências de push.' })
        return
      }
      setEstado(data)
      setPreferencias(data)
    }
    void carregar()
    return () => pedido.abort()
  }, [tentativa])

  async function guardar(evento) {
    evento.preventDefault()
    if (aGuardar || !preferencias) return
    setAGuardar(true)
    setMensagem(null)
    try {
      const { data, error } = await supabase.rpc('guardar_preferencias_push', {
        p_conta: preferencias.conta,
        p_new_matches: preferencias.new_matches,
        p_reminders: preferencias.reminders,
        p_results: preferencias.results,
      })
      if (error || data !== true) throw new Error()
      setEstado(preferencias)
      setMensagem({ texto: 'Preferências guardadas.' })
    } catch {
      setMensagem({ erro: true, texto: 'Não foi possível guardar. Tenta novamente.' })
    } finally {
      setAGuardar(false)
    }
  }

  return (
    <section className="pn-item pn-preferencias" aria-labelledby="pn-preferencias-titulo">
      <h3 id="pn-preferencias-titulo">Preferências de push</h3>
      <p className="pn-nota">Escolhe os avisos que queres receber nos dispositivos ligados à tua conta.</p>
      {!estado && <p role="status">A carregar preferências…</p>}
      {estado?.erro && <>
        <p role="alert" className="pn-erro">{estado.erro}</p>
        <button type="button" onClick={() => {
          setEstado(null)
          setTentativa(valor => valor + 1)
        }}>Tentar novamente</button>
      </>}
      {preferencias && (
        <form onSubmit={guardar}>
          <fieldset disabled={aGuardar}>
            <legend>Tipos de aviso</legend>
            {categorias.map(([id, nome]) => (
              <label key={id}>
                <input type="checkbox" checked={preferencias[id]} onChange={e => {
                  setPreferencias({ ...preferencias, [id]: e.target.checked })
                  setMensagem(null)
                }} />
                {nome}
              </label>
            ))}
            <button type="submit" disabled={categorias.every(([id]) => estado[id] === preferencias[id])}>
              {aGuardar ? 'A guardar…' : 'Guardar preferências'}
            </button>
          </fieldset>
          {mensagem && <p role={mensagem.erro ? 'alert' : 'status'} className={mensagem.erro ? 'pn-erro' : undefined}>{mensagem.texto}</p>}
        </form>
      )}
    </section>
  )
}
