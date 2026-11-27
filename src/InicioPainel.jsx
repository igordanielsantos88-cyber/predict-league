import EmblemaEquipa from './EmblemaEquipa'

const horaLisboa = new Intl.DateTimeFormat('pt-PT', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon',
})

export default function InicioPainel({ resumo, aCarregar, erro, competicaoId, abrir, atualizar }) {
  const [jogo, ...seguintes] = aCarregar || erro ? [] : resumo.proximos
  const pendentes = resumo.porFazer ?? 0
  return (
    <>
      <section className="pl-proximo" aria-labelledby="pl-proximo-titulo" aria-busy={aCarregar}>
        <h2 id="pl-proximo-titulo">Próximo jogo</h2>
        {jogo ? (
          <>
            <div className="pl-proximo-equipas">
              <div className="pl-proximo-equipa">
                <EmblemaEquipa nome={jogo.home_team} origem={jogo.home_crest} />
                <strong>{jogo.home_team}</strong>
              </div>
              <span>vs</span>
              <div className="pl-proximo-equipa">
                <EmblemaEquipa nome={jogo.away_team} origem={jogo.away_crest} />
                <strong>{jogo.away_team}</strong>
              </div>
            </div>
            <div className="pl-proximo-rodape">
              <p>Prazo até <time dateTime={jogo.kickoff}>{horaLisboa.format(new Date(jogo.kickoff))}</time></p>
              <button type="button" className="pl-gold-button" onClick={() => abrir('proximo-jogo', jogo.id)}>
                {jogo.prognosticado ? 'Ver prognóstico' : 'Fazer prognóstico'} <span aria-hidden="true">→</span>
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
