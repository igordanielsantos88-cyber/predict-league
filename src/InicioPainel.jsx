import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { descreverMovimento } from './movimentoClassificacao'
import EmblemaEquipa from './EmblemaEquipa'

const horaLisboa = new Intl.DateTimeFormat('pt-PT', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon',
})

function UltimaJornada({ competicaoId, abrir, atualizacao }) {
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    let pedido
    async function carregar() {
      pedido?.abort()
      const atual = new AbortController()
      pedido = atual
      const { data, error } = await supabase.rpc('obter_ultima_jornada_concluida', {
        p_competition_id: competicaoId,
      }).abortSignal(atual.signal)
      if (!atual.signal.aborted && !error) setEstado(data)
    }
    void carregar()
    const intervalo = setInterval(carregar, 60000)
    window.addEventListener('focus', carregar)
    return () => {
      pedido?.abort()
      clearInterval(intervalo)
      window.removeEventListener('focus', carregar)
    }
  }, [competicaoId, atualizacao])

  if (!estado?.jornadaId) return null
  const exatos = estado.jogos.filter(jogo => jogo.acerto === 'exato').length
  const nome = estado.nome || `Jornada ${estado.numero}`

  return (
    <section className="pl-agenda" aria-labelledby="pl-ultima-jornada">
      <div className="pl-section-heading">
        <h2 className="pl-section-title" id="pl-ultima-jornada">Última jornada concluída</h2>
        <button type="button" className="pl-refresh" onClick={() => abrir('liga', estado.jornadaId)}>Ver resumo</button>
      </div>
      <div className="pl-stat">
        <span className="pl-stat-label">{nome}</span>
        <strong>{estado.pontos} {estado.pontos === 1 ? 'ponto' : 'pontos'} · {exatos} {exatos === 1 ? 'exato' : 'exatos'}</strong>
        <span className="pl-stat-label">{descreverMovimento(estado.posicaoAnterior, estado.posicaoAtual)}</span>
      </div>
    </section>
  )
}

export default function InicioPainel({ resumo, aCarregar, erro, competicaoId, abrir, atualizar, atualizacao }) {
  const mostrarCalendario = !aCarregar && !erro
  const proximoPendente = mostrarCalendario && resumo.proximoPendente
  const jogo = proximoPendente || (mostrarCalendario && resumo.proximos[0])
  const resultado = mostrarCalendario && !jogo && resumo.ultimoResultado
  const destaque = jogo || resultado
  const seguintes = mostrarCalendario ? resumo.proximos.filter(item => item.id !== jogo?.id).slice(0, 3) : []
  const pendentes = resumo.porFazer ?? 0

  const kickoff = jogo?.kickoff
  useEffect(() => {
    if (!kickoff) return
    const prazo = Date.parse(kickoff) - Date.now()
    // Navegadores limitam a duração máxima de um temporizador.
    if (!Number.isFinite(prazo) || prazo > 2147483547) return
    const tempo = window.setTimeout(atualizar, Math.max(0, prazo) + 100)
    return () => window.clearTimeout(tempo)
  }, [kickoff, atualizar])
  return (
    <>
      <section className="pl-proximo" aria-labelledby="pl-proximo-titulo" aria-busy={aCarregar}>
        <h2 id="pl-proximo-titulo">
          {proximoPendente ? 'Próximo prognóstico em falta' : resultado ? 'Último resultado' : 'Próximo jogo'}
        </h2>
        {destaque ? (
          <>
            <div className="pl-proximo-equipas">
              <div className="pl-proximo-equipa">
                <EmblemaEquipa nome={destaque.home_team} origem={destaque.home_crest} />
                <strong>{destaque.home_team}</strong>
              </div>
              <span>{resultado ? `${resultado.home_score}–${resultado.away_score}` : 'vs'}</span>
              <div className="pl-proximo-equipa">
                <EmblemaEquipa nome={destaque.away_team} origem={destaque.away_crest} />
                <strong>{destaque.away_team}</strong>
              </div>
            </div>
            <div className="pl-proximo-rodape">
              {destaque.kickoff && <p>{proximoPendente && 'Prazo até '}
                <time dateTime={destaque.kickoff}>{horaLisboa.format(new Date(destaque.kickoff))}</time></p>}
              <button type="button" className="pl-gold-button" onClick={() => abrir('proximo-jogo', destaque.id)}>
                {resultado ? 'Ver resultado' : proximoPendente ? 'Fazer prognóstico' : 'Ver jogo'} <span aria-hidden="true">→</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p role={aCarregar ? 'status' : undefined}>{aCarregar ? 'A carregar calendário…'
              : erro ? 'Calendário temporariamente indisponível.' : 'Sem jogos futuros agendados.'}</p>
            <button type="button" className="pl-gold-button" disabled={!competicaoId} onClick={() => abrir('prognosticos')}>
              Ver jogos <span aria-hidden="true">→</span>
            </button>
          </>
        )}
      </section>

      <div className="pl-section-heading">
        <h2 className="pl-section-title">O meu resumo</h2>
        <button type="button" className="pl-refresh" disabled={aCarregar || !competicaoId} onClick={atualizar}>Atualizar</button>
      </div>
      {erro && <p className="pl-info pl-info-error" role="alert">Não foi possível atualizar o resumo.</p>}
      <div className="pl-stats" aria-busy={aCarregar}>
        <button type="button" className="pl-stat" disabled={!competicaoId} onClick={() => abrir('prognosticos-pendentes')}>
          <span className="pl-stat-label">Por prognosticar</span>
          <strong>{aCarregar ? '…' : erro ? '—' : pendentes}</strong>
        </button>
        <div className="pl-stat">
          <span className="pl-stat-label">Pontos</span>
          <strong>{aCarregar ? '…' : erro ? '—' : resumo.pontos ?? '—'}</strong>
        </div>
        <div className="pl-stat">
          <span className="pl-stat-label">Posição</span>
          <strong>{aCarregar ? '…' : erro || !resumo.posicao ? '—' : `${resumo.posicao}.º`}</strong>
        </div>
      </div>
      {competicaoId && <UltimaJornada key={competicaoId} competicaoId={competicaoId} abrir={abrir} atualizacao={atualizacao} />}
      {seguintes.length > 0 && (
        <section className="pl-agenda" aria-labelledby="pl-agenda-titulo">
          <div className="pl-section-heading">
            <h2 id="pl-agenda-titulo" className="pl-section-title">A seguir</h2>
            <button type="button" className="pl-refresh" onClick={() => abrir('prognosticos')}>Ver todos</button>
          </div>
          <ul>
            {seguintes.map(item => (
              <li key={item.id}>
                <button type="button" onClick={() => abrir('proximo-jogo', item.id)}>
                  <span className="pl-agenda-emblemas">
                    <EmblemaEquipa nome={item.home_team} origem={item.home_crest} />
                    <EmblemaEquipa nome={item.away_team} origem={item.away_crest} />
                  </span>
                  <span className="pl-agenda-jogo">
                    <strong>{item.home_team} vs {item.away_team}</strong>
                    <time dateTime={item.kickoff}>{horaLisboa.format(new Date(item.kickoff))}</time>
                  </span>
                  <span className={item.prognosticado ? 'pl-agenda-guardado' : 'pl-agenda-pendente'}>
                    {item.prognosticado ? 'Guardado' : 'Por preencher'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
