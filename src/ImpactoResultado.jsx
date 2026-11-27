import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function ImpactoResultado({ jogoId, casa, fora }) {
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    const pedido = new AbortController()
    async function carregar() {
      const { data, error } = await supabase.rpc('prever_impacto_resultado', {
        p_jogo: jogoId, p_casa: casa, p_fora: fora,
      }).abortSignal(pedido.signal)
      if (pedido.signal.aborted) return
      if (error || typeof data?.prognosticos !== 'number') {
        setEstado({ erro: true })
      } else {
        setEstado(data)
      }
    }
    void carregar()
    return () => pedido.abort()
  }, [jogoId, casa, fora])

  if (!estado) return <p role="status">A calcular o impacto deste marcador…</p>
  if (estado.erro) return <p role="alert">Não foi possível pré-visualizar o impacto deste marcador.</p>

  return (
    <div aria-label="Impacto previsto">
      <h5>Impacto previsto</h5>
      <p><strong>{estado.exatos + estado.tendencias} de {estado.prognosticos}</strong> prognósticos pontuariam.</p>
      <p>{estado.exatos} exatos · {estado.tendencias} só na tendência</p>
      {estado.movimentos == null ? (
        <p>Ainda não há pontuação suficiente e consistente nesta época para prever as posições.</p>
      ) : estado.movimentos.length ? (
        <ul>
          {estado.movimentos.map((item, i) => (
            <li key={i}>{item.jogador}: {item.antes}.º → {item.depois}.º</li>
          ))}
        </ul>
      ) : <p>Sem alterações de posição identificáveis.</p>}
    </div>
  )
}
