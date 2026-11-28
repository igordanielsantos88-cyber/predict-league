import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { descreverMovimento } from './movimentoClassificacao'
import EmblemaEquipa from './EmblemaEquipa'
import IconePainel from './IconePainel'
import './inicioPainel.css'

const dataLisboa = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Lisbon',
})
const horaLisboa = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon',
})
const numero = new Intl.NumberFormat('pt-PT')

function prazoRestante(kickoff, agora) {
  const ms = Date.parse(kickoff) - agora
  if (!Number.isFinite(ms)) return null
  if (ms <= 0) return 'Prazo terminado'
  const minutos = Math.ceil(ms / 60000)
  const dias = Math.floor(minutos / 1440)
  const horas = Math.floor(minutos % 1440 / 60)
  const resto = minutos % 60
  if (dias > 0) return `${dias}d ${horas}h`
  if (horas > 0) return `${horas}h ${String(resto).padStart(2, '0')}min`
  return `${resto} min`
}

function DataJogo({ kickoff }) {
  if (!kickoff || !Number.isFinite(Date.parse(kickoff))) return null
  const data = new Date(kickoff)
  return <time dateTime={kickoff}>{dataLisboa.format(data)} · {horaLisboa.format(data)}</time>
}

function UltimaJornada({ competicaoId, abrir, atualizacao }) {
  const [estado, setEstado] = useState(null)
  const [falhou, setFalhou] = useState(false)
  useEffect(() => {
    let pedido
    async function carregar() {
      pedido?.abort()
      const atual = new AbortController()
      pedido = atual
      try {
        const { data, error } = await supabase.rpc('obter_ultima_jornada_concluida', {
          p_competition_id: competicaoId,
        }).abortSignal(atual.signal)
        if (!atual.signal.aborted) {
          setFalhou(Boolean(error))
          if (!error) setEstado(data)
        }
      } catch {
        if (!atual.signal.aborted) setFalhou(true)
      }
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

  if (!estado?.jornadaId) {
    return falhou ? (
      <section className="pl-home-card pl-home-round" aria-label="Última jornada">
        <h2>Última jornada</h2>
        <p className="pl-home-muted" role="status">Resumo temporariamente indisponível.</p>
      </section>
    ) : null
  }
  const exatos = (estado.jogos || []).filter(jogo => jogo.acerto === 'exato').length
  const nome = estado.nome || `Jornada ${estado.numero}`
  const movimento = estado.posicaoAnterior != null && estado.posicaoAtual != null
    ? estado.posicaoAnterior - estado.posicaoAtual : null
  return (
    <section className="pl-home-card pl-home-round" aria-labelledby="pl-ultima-jornada">
      <div className="pl-home-card-heading">
        <div><p className="pl-home-kicker">Última jornada concluída</p><h2 id="pl-ultima-jornada">{nome}</h2></div>
        <span className="pl-home-icon"><IconePainel nome="liga" /></span>
      </div>
      <div className="pl-home-round-numbers">
        <div><strong>{numero.format(estado.pontos ?? 0)}</strong><span>Pontos</span></div>
        <div><strong>{numero.format(exatos)}</strong><span>Resultados exatos</span></div>
      </div>
      <p className={`pl-home-movement ${movimento > 0 ? 'subiu' : movimento < 0 ? 'desceu' : ''}`}>
        <IconePainel nome={movimento > 0 ? 'subir' : movimento < 0 ? 'descer' : 'estatisticas'} tamanho={18} />
        {descreverMovimento(estado.posicaoAnterior, estado.posicaoAtual)}
      </p>
      {falhou && <p className="pl-home-muted" role="status">Não foi possível atualizar o resumo.</p>}
      <button type="button" className="pl-home-secondary" onClick={() => abrir('liga', estado.jornadaId)}>
        Ver resumo da jornada <IconePainel nome="avancar" tamanho={18} />
      </button>
    </section>
  )
}

function ResumoJogador({ resumo, aCarregar, erro, competicaoId, abrir }) {
  const disponivel = Boolean(competicaoId) && !aCarregar && !erro
  const total = disponivel ? resumo.totalFuturos : null
  const pendentes = disponivel ? resumo.porFazer : null
  const completos = Number.isFinite(total) && Number.isFinite(pendentes) ? Math.max(0, total - pendentes) : null
  const valor = n => aCarregar ? '…' : disponivel && n != null ? numero.format(n) : '—'
  return (
    <section className="pl-home-card pl-home-summary" aria-labelledby="pl-home-resumo" aria-busy={aCarregar}>
      <div className="pl-home-card-heading">
        <div><p className="pl-home-kicker">O meu desempenho</p><h2 id="pl-home-resumo">A minha classificação</h2></div>
        <span className="pl-home-icon"><IconePainel nome="estatisticas" /></span>
      </div>
      <div className="pl-home-metrics">
        <button type="button" className="pl-home-metric" disabled={!competicaoId} onClick={() => abrir('liga')}>
          <span>Posição</span>
          <strong>{aCarregar ? '…' : disponivel && resumo.posicao != null ? `${resumo.posicao}.º` : '—'}</strong>
          <span className="pl-home-metric-link">Classificação <IconePainel nome="avancar" tamanho={14} /></span>
        </button>
        <button type="button" className="pl-home-metric" disabled={!competicaoId} onClick={() => abrir('estatisticas')}>
          <span>Pontos</span><strong>{valor(resumo.pontos)}</strong>
          <span className="pl-home-metric-link">Estatísticas <IconePainel nome="avancar" tamanho={14} /></span>
        </button>
      </div>
      <div className="pl-home-progress">
        <div className="pl-home-progress-top">
          <div><h3>Os meus prognósticos</h3><span>Jogos futuros agendados</span></div>
          <strong className={pendentes === 0 && total > 0 ? 'pl-home-complete' : ''}>{valor(pendentes)} <small>em falta</small></strong>
        </div>
        {disponivel && total > 0 && completos != null ? (
          <>
            <progress max={total} value={completos} aria-label="Prognósticos guardados dos jogos futuros" />
            <p className="pl-home-progress-label">
              {numero.format(completos)} de {numero.format(total)} guardados
              {pendentes === 0 && <span className="pl-home-complete"><IconePainel nome="visto" tamanho={16} /> Tudo em dia</span>}
            </p>
          </>
        ) : <p className="pl-home-muted">{aCarregar ? 'A carregar prognósticos…' : erro ? 'Não foi possível atualizar os dados.' : disponivel && total === 0 ? 'Sem jogos futuros disponíveis.' : 'A aguardar dados da competição.'}</p>}
        <button type="button" className="pl-home-secondary" disabled={!competicaoId}
          onClick={() => abrir(pendentes === 0 ? 'prognosticos' : 'prognosticos-pendentes')}>
          {pendentes === 0 ? 'Ver calendário' : 'Ver prognósticos em falta'} <IconePainel nome="avancar" tamanho={18} />
        </button>
      </div>
    </section>
  )
}

export default function InicioPainel({ resumo, aCarregar, erro, competicaoId, abrir, atualizar, atualizacao }) {
  const mostrarCalendario = Boolean(competicaoId) && !aCarregar && !erro
  const proximoPendente = mostrarCalendario && resumo.proximoPendente
  const jogo = proximoPendente || (mostrarCalendario && resumo.proximos[0])
  const resultado = mostrarCalendario && !jogo && resumo.ultimoResultado
  const destaque = jogo || resultado
  const seguintes = mostrarCalendario ? resumo.proximos.filter(item => item.id !== jogo?.id).slice(0, 3) : []
  const [agora, setAgora] = useState(Date.now)
  const kickoff = jogo?.kickoff
  const prazo = kickoff ? prazoRestante(kickoff, agora) : null
  const prazoAberto = kickoff && Date.parse(kickoff) > agora
  const porPreencher = Boolean(proximoPendente && prazoAberto)
  useEffect(() => {
    if (!kickoff) return
    const ms = Date.parse(kickoff) - Date.now()
    if (!Number.isFinite(ms)) return
    const atualizarRelogio = () => setAgora(Date.now())
    atualizarRelogio()
    const relogio = window.setInterval(atualizarRelogio, 30000)
    window.addEventListener('focus', atualizarRelogio)
    const timer = ms <= 2147483547 ? window.setTimeout(() => {
      atualizarRelogio()
      atualizar()
    }, Math.max(0, ms) + 100) : null
    return () => {
      window.clearInterval(relogio)
      window.removeEventListener('focus', atualizarRelogio)
      if (timer != null) window.clearTimeout(timer)
    }
  }, [kickoff, atualizar])

  return (
    <main className="pl-home">
      <header className="pl-home-header">
        <div><p className="pl-home-kicker">A tua competição</p><h1>A tua liga</h1><p className="pl-home-muted">Acompanha os jogos e sobe na classificação.</p></div>
        <button type="button" className="pl-refresh pl-home-refresh" disabled={aCarregar || !competicaoId} onClick={atualizar}>
          <IconePainel nome="atualizar" tamanho={18} /><span>Atualizar</span>
        </button>
      </header>
      {erro && <p className="pl-home-error" role="alert">Não foi possível atualizar o resumo. Tenta novamente.</p>}
      <div className="pl-home-grid">
        <section className="pl-home-card pl-home-hero" aria-labelledby="pl-home-jogo" aria-busy={aCarregar}>
          <div className="pl-home-card-heading">
            <div><p className="pl-home-kicker">Centro de jogos</p>
              <h2 id="pl-home-jogo">{resultado ? 'Último resultado' : proximoPendente ? 'Próximo prognóstico' : 'Próximo jogo'}</h2></div>
            {destaque && <span className={`pl-home-status ${porPreencher ? 'pendente' : jogo?.prognosticado ? 'guardado' : ''}`}>
              {resultado ? 'Terminado' : porPreencher ? 'Por preencher' : !prazoAberto ? 'Prazo encerrado' : jogo?.prognosticado ? 'Guardado' : 'Agendado'}
            </span>}
          </div>
          {destaque ? (
            <>
              <div className="pl-home-match">
                <div className="pl-home-team"><EmblemaEquipa nome={destaque.home_team} origem={destaque.home_crest} /><strong>{destaque.home_team}</strong></div>
                <div className="pl-home-match-center">
                  <strong className="pl-home-score">{resultado ? `${resultado.home_score} – ${resultado.away_score}` : <DataJogoHora kickoff={destaque.kickoff} />}</strong>
                  <span>{resultado ? 'Resultado final' : 'Hora de início'}</span>
                </div>
                <div className="pl-home-team"><EmblemaEquipa nome={destaque.away_team} origem={destaque.away_crest} /><strong>{destaque.away_team}</strong></div>
              </div>
              <div className="pl-home-match-date"><IconePainel nome="jornadas" tamanho={17} /> <DataJogo kickoff={destaque.kickoff} /></div>
              {jogo && prazo && <div className="pl-home-deadline"><IconePainel nome="relogio" tamanho={18} /><span>{prazoAberto ? 'Tempo até ao início' : 'Prognósticos encerrados'}</span><strong>{prazoAberto ? prazo : '—'}</strong></div>}
              <button type="button" className="pl-gold-button pl-home-primary" onClick={() => abrir('proximo-jogo', destaque.id)}>
                {resultado ? 'Ver resultado' : porPreencher ? 'Fazer prognóstico' : 'Ver jogo'} <IconePainel nome="avancar" tamanho={20} />
              </button>
            </>
          ) : (
            <div className="pl-home-empty">
              <span className="pl-home-icon"><IconePainel nome="prognosticos" tamanho={30} /></span>
              <p role={aCarregar ? 'status' : undefined}>{aCarregar ? 'A carregar calendário…' : erro ? 'Calendário temporariamente indisponível.' : !competicaoId ? 'A aguardar uma competição ativa.' : 'Sem jogos futuros agendados.'}</p>
              <button type="button" className="pl-gold-button pl-home-primary" disabled={!competicaoId} onClick={() => abrir('prognosticos')}>Ver jogos <IconePainel nome="avancar" tamanho={20} /></button>
            </div>
          )}
        </section>
        <ResumoJogador resumo={resumo} aCarregar={aCarregar} erro={erro} competicaoId={competicaoId} abrir={abrir} />
        {seguintes.length > 0 && (
          <section className="pl-home-card pl-home-agenda" aria-labelledby="pl-home-agenda">
            <div className="pl-home-card-heading">
              <div><p className="pl-home-kicker">Calendário</p><h2 id="pl-home-agenda">A seguir</h2></div>
              <button type="button" className="pl-home-link" onClick={() => abrir('prognosticos')}>Ver todos <IconePainel nome="avancar" tamanho={16} /></button>
            </div>
            <ul>
              {seguintes.map(item => (
                <li key={item.id}>
                  <button type="button" className="pl-home-agenda-row" onClick={() => abrir('proximo-jogo', item.id)}>
                    <div className="pl-home-agenda-crests"><EmblemaEquipa nome={item.home_team} origem={item.home_crest} /><EmblemaEquipa nome={item.away_team} origem={item.away_crest} /></div>
                    <div className="pl-home-agenda-teams"><strong>{item.home_team} – {item.away_team}</strong><DataJogo kickoff={item.kickoff} /></div>
                    <span className={`pl-home-status ${item.prognosticado ? 'guardado' : 'pendente'}`}>{item.prognosticado ? 'Guardado' : 'Em falta'}</span>
                    <IconePainel nome="avancar" tamanho={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {competicaoId && <UltimaJornada key={competicaoId} competicaoId={competicaoId} abrir={abrir} atualizacao={atualizacao} />}
      </div>
      <section className="pl-home-shortcuts" aria-labelledby="pl-home-shortcuts">
        <h2 id="pl-home-shortcuts">Explorar a liga</h2>
        <div>
          {[['estatisticas','Estatísticas'], ['duelo','Duelos'], ['conquistas','Conquistas'], ['chat','Chat']].map(([id, nome]) => (
            <button type="button" key={id} disabled={!competicaoId} onClick={() => abrir(id)}><span className="pl-home-icon"><IconePainel nome={id} /></span><span>{nome}</span></button>
          ))}
        </div>
      </section>
    </main>
  )
}

function DataJogoHora({ kickoff }) {
  return kickoff && Number.isFinite(Date.parse(kickoff)) ? horaLisboa.format(new Date(kickoff)) : 'VS'
}
