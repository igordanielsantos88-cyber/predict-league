import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function HistoricoResultado({ jogoId, golosCasa, golosFora }) {
  const [aberto, setAberto] = useState(false)
  const [estado, setEstado] = useState(null)
  const marcador = `${jogoId}:${golosCasa}:${golosFora}`

  useEffect(() => {
    if (!aberto) return
    const pedido = new AbortController()
    async function carregar() {
      const { data, error } = await supabase.rpc('obter_historico_resultado', {
        p_match_id: jogoId,
      }).abortSignal(pedido.signal)
      if (pedido.signal.aborted) return
      setEstado({ marcador, historico: Array.isArray(data) && !error ? data : null })
    }
    void carregar()
    return () => pedido.abort()
  }, [aberto, jogoId, marcador])

  const atual = estado?.marcador === marcador ? estado : null
  return (
    <details className="pl-jornadas-form-extra" onToggle={e => {
      setAberto(e.currentTarget.open)
      if (!e.currentTarget.open) setEstado(null)
    }}>
      <summary>Histórico de correções</summary>
      {!atual ? <p role="status">A carregar histórico…</p> : !atual.historico ? (
        <p role="alert">Não foi possível carregar o histórico. Fecha e volta a abrir para tentar novamente.</p>
      ) : !atual.historico.length ? <p>Sem correções registadas.</p> : (
        <ul>
          {atual.historico.map(item => (
            <li key={item.id}>
              <strong>{item.old_home_score}–{item.old_away_score} → {item.new_home_score}–{item.new_away_score}</strong>
              {' · '}{item.changed_by_name || item.changed_by || 'Sem conta associada'}
              {' · '}<time dateTime={item.changed_at}>
                {new Date(item.changed_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
