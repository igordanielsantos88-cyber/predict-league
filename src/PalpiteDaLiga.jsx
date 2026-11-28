import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const percentagem = new Intl.NumberFormat('pt-PT', { style: 'percent', maximumFractionDigits: 1 })

export default function PalpiteDaLiga({ jogo }) {
  const [estado, setEstado] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const pedido = new AbortController()
    async function carregar() {
      const { data, error } = await supabase.rpc('obter_palpite_da_liga', {
        p_match_id: jogo.id,
      }).abortSignal(pedido.signal)
      if (!pedido.signal.aborted) setEstado({ dados: data, erro: !!error })
    }
    void carregar()
    return () => pedido.abort()
  }, [jogo.id, tentativa])

  const dados = estado?.dados
  return (
    <section className="pl-jogo-outros pl-palpite-liga" aria-label="O palpite da liga">
      <h4>O palpite da liga</h4>
      {!estado && <p role="status">A carregar os palpites…</p>}
      {estado?.erro && (
        <>
          <p role="alert">Não foi possível carregar os palpites da liga.</p>
          <button type="button" className="pl-jogo-secundario" onClick={() => {
            setEstado(null)
            setTentativa(valor => valor + 1)
          }}>Tentar novamente</button>
        </>
      )}
      {estado && !estado.erro && !dados && <p>Disponível após o início do jogo.</p>}
      {dados?.total === 0 && <p>Ainda não há prognósticos para este jogo.</p>}
      {dados?.total > 0 && (
        <>
          <p>{dados.total} {dados.total === 1 ? 'prognóstico' : 'prognósticos'}</p>
          {[[`Vitória · ${jogo.home_team}`, dados.casa], ['Empate', dados.empate],
            [`Vitória · ${jogo.away_team}`, dados.fora]].map(([nome, votos]) => (
            <div className="pl-palpite-liga-linha" key={nome}>
              <span>{nome}</span>
              <strong>{votos} · {percentagem.format(votos / dados.total)}</strong>
              <span className="pl-palpite-liga-barra" aria-hidden="true">
                <span style={{ width: `${100 * votos / dados.total}%` }} />
              </span>
            </div>
          ))}
          <p>
            {dados.populares.length === 1 ? 'Marcador mais escolhido' : 'Marcadores mais escolhidos, empatados'}
            {' · '}<strong>{dados.populares.map(({ casa, fora }) => `${casa}–${fora}`).join(', ')}</strong>
            {' · '}{dados.populares[0]?.votos} {dados.populares[0]?.votos === 1 ? 'voto' : 'votos'} por marcador
          </p>
        </>
      )}
    </section>
  )
}
