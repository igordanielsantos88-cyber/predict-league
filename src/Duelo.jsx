import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const estilos = `
  .pl-duelo { color:#f8fafc; font-family:Arial,sans-serif; width:100%; min-width:0; }
  .pl-duelo * { box-sizing:border-box; }
  .pl-duelo h2 { color:#e8c76a; font-size:clamp(22px,4vw,28px); margin:0 0 12px; }
  .pl-duelo h3 { color:#e8c76a; font-size:19px; margin:0 0 18px; }
  .pl-duelo p { line-height:1.7; }
  .pl-duelo-nota { color:#a7b5c9; font-size:13px; line-height:1.7; }
  .pl-duelo-controlos { display:flex; flex-wrap:wrap; align-items:end; gap:14px; margin:24px 0; }
  .pl-duelo-campo { display:flex; flex-direction:column; gap:8px; flex:1 1 200px; min-width:0; }
  .pl-duelo label { color:#e8c76a; font-size:13px; font-weight:bold; }
  .pl-duelo select,.pl-duelo button { font:inherit; border:1px solid #8f722e; border-radius:10px; padding:12px; background:#1b2535; color:#f8fafc; max-width:100%; }
  .pl-duelo button { cursor:pointer; }
  .pl-duelo button:disabled { cursor:wait; opacity:.5; }
  .pl-duelo :focus-visible { outline:2px solid #f0d477; outline-offset:3px; }
  .pl-duelo-painel { border:1px solid #594821; border-radius:18px; padding:23px; margin-bottom:22px; background:linear-gradient(145deg,#1b2535,#111827); min-width:0; }
  .pl-duelo-aviso { border:1px solid #8f722e; padding:14px 18px; border-radius:12px; color:#f0d477; margin:16px 0; line-height:1.6; }
  .pl-duelo-erro { background:#ef444410; border:1px solid #ef444460; color:#fca5a5; padding:16px; border-radius:12px; margin-bottom:20px; }
  .pl-duelo-confronto { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); align-items:center; gap:12px; text-align:center; }
  .pl-duelo-jogador { min-width:0; padding:20px 10px; border:1px solid #594821; border-radius:14px; background:#0d1523; }
  .pl-duelo-jogador h3 { color:#f8fafc; overflow-wrap:anywhere; margin-bottom:12px; }
  .pl-duelo-jogador strong { display:block; font-size:clamp(28px,6vw,40px); color:#f0d477; margin-bottom:8px; }
  .pl-duelo-jogador.outro strong { color:#9ccbf3; }
  .pl-duelo-jogador span { font-size:12px; color:#a7b5c9; }
  .pl-duelo-diferenca { text-align:center; color:#e8c76a; margin:18px 0 0; }
  .pl-duelo-scroll { overflow-x:auto; }
  .pl-duelo table { border-collapse:collapse; width:100%; font-size:14px; table-layout:fixed; }
  .pl-duelo th,.pl-duelo td { padding:13px 10px; border-bottom:1px solid #29384d; text-align:center; overflow-wrap:anywhere; }
  .pl-duelo th:first-child { text-align:left; width:42%; }
  .pl-duelo thead th { color:#e8c76a; }
  .pl-duelo tbody th { font-weight:normal; color:#cbd5e1; }
  .pl-duelo tbody tr:last-child > * { border-bottom:0; }
  .pl-duelo-ronda { margin:22px 0; }
  .pl-duelo-ronda h4 { margin:0 0 12px; overflow-wrap:anywhere; }
  .pl-duelo-barra-linha { display:grid; grid-template-columns:minmax(65px,100px) minmax(0,1fr) 42px; align-items:center; gap:10px; margin:10px 0; font-size:13px; }
  .pl-duelo-barra-linha > span { overflow-wrap:anywhere; }
  .pl-duelo-barra-fundo { background:#29384d; height:14px; border-radius:10px; overflow:hidden; }
  .pl-duelo-barra { background:linear-gradient(90deg,#98741f,#f0d477); height:100%; border-radius:10px; }
  .pl-duelo-barra.outro { background:linear-gradient(90deg,#365675,#9ccbf3); }
  @media(max-width:600px) { .pl-duelo-painel { padding:16px 12px; } .pl-duelo-confronto { gap:6px; } .pl-duelo-jogador { padding:15px 6px; } .pl-duelo-jogador h3 { font-size:15px; } .pl-duelo th,.pl-duelo td { padding:12px 6px; font-size:12px; } }
`

function taxaAcerto(jogador) {
  return jogador.pontuados > 0
    ? `${(100 * (jogador.exatos + jogador.soTendencia) / jogador.pontuados).toFixed(1).replace('.', ',')}%`
    : '—'
}

function resumoDiferenca(eu, outro) {
  if (!eu.pontuados && !outro.pontuados) return 'Ainda não existem prognósticos pontuados para comparar.'
  const diferenca = eu.pontos - outro.pontos
  if (diferenca === 0) return 'Têm os mesmos pontos nesta época.'
  const quantidade = Math.abs(diferenca)
  return `Tens ${quantidade} ${quantidade === 1 ? 'ponto' : 'pontos'} ${diferenca > 0 ? 'a mais' : 'a menos'} nesta época.`
}

function validarDuelo(data, competicaoId, userId, adversarioId, epocaId) {
  if (!data || data.versao !== 1 || data.competicaoId !== competicaoId ||
      data.utilizadorId !== userId || !data.epoca?.id ||
      (epocaId && data.epoca.id !== epocaId) ||
      (adversarioId && data.adversarioId !== adversarioId) ||
      data.adversarioId === userId ||
      !Array.isArray(data.participantes) || !Array.isArray(data.epocas) ||
      !Array.isArray(data.jogadores) || !Array.isArray(data.jornadas)) {
    throw new Error('A comparação recebida não corresponde à seleção atual.')
  }
  const ids = new Set(data.jogadores.map(j => j.id))
  if (!ids.has(userId) || ids.size !== data.jogadores.length ||
      data.jogadores.length !== (data.adversarioId ? 2 : 1) ||
      (data.adversarioId && (!ids.has(data.adversarioId) || !data.participantes.some(p => p.id === data.adversarioId)))) {
    throw new Error('Não foi possível identificar os participantes da comparação.')
  }
  for (const j of data.jogadores) {
    for (const campo of ['pontos', 'pontuados', 'exatos', 'soTendencia', 'errados', 'semPrognostico']) {
      if (!Number.isSafeInteger(j[campo]) || j[campo] < 0) throw new Error('Os dados da comparação são inválidos.')
    }
    if (j.exatos + j.soTendencia + j.errados !== j.pontuados) throw new Error('Os totais da comparação não coincidem.')
  }
  for (const j of data.jornadas) {
    for (const campo of ['jogos', 'terminados', 'meusPontos', 'outrosPontos']) {
      if (!Number.isSafeInteger(j[campo]) || j[campo] < 0) throw new Error('Os dados por jornada são inválidos.')
    }
  }
  return data
}

export default function Duelo({ competicaoId }) {
  const [selecao, setSelecao] = useState(null)
  const [atualizacao, setAtualizacao] = useState(0)
  const [estado, setEstado] = useState(null)
  const [catalogo, setCatalogo] = useState(null)
  const epocaId = selecao?.competicaoId === competicaoId ? selecao?.epocaId ?? null : null
  const adversarioId = selecao?.competicaoId === competicaoId ? selecao?.adversarioId ?? null : null
  const chave = JSON.stringify([competicaoId, epocaId, adversarioId, atualizacao])

  useEffect(() => {
    let ativo = true
    const controller = new AbortController()
    async function carregar() {
      try {
        if (!competicaoId) throw new Error('Não foi possível identificar a competição. Volta ao painel e tenta novamente.')
        const { data: auth, error: erroAuth } = await supabase.auth.getUser()
        if (!ativo) return
        if (erroAuth || !auth?.user) throw new Error('Inicia sessão para consultar o Duelo.')
        const { data, error } = await supabase.rpc('obter_duelo', {
          p_competition_id: competicaoId,
          p_opponent_id: adversarioId || null,
          p_season_id: epocaId || null,
        }).abortSignal(controller.signal)
        if (!ativo) return
        if (error) {
          if (error.code === 'P0002') throw new Error('Não foi encontrada uma época disponível para esta seleção.')
          if (error.code === 'P0003') throw new Error('Existe mais de uma época ativa. O administrador deve verificar as épocas.')
          throw error
        }
        const dados = validarDuelo(data, competicaoId, auth.user.id, adversarioId, epocaId)
        setCatalogo({ competicaoId, participantes: dados.participantes, epocas: dados.epocas,
          adversarioId: dados.adversarioId })
        setEstado({ chave, dados, erro: '' })
      } catch (erro) {
        if (ativo) setEstado({ chave, dados: null, erro: erro.message || 'Não foi possível carregar o Duelo.' })
      }
    }
    carregar()
    return () => { ativo = false; controller.abort() }
  }, [competicaoId, epocaId, adversarioId, atualizacao, chave])

  const aCarregar = estado?.chave !== chave
  const dados = !aCarregar && !estado?.erro ? estado?.dados : null
  const erro = !aCarregar ? estado?.erro : ''
  const opcoes = catalogo?.competicaoId === competicaoId ? catalogo : null
  const adversarioEscolhido = adversarioId || opcoes?.adversarioId || ''
  const eu = dados?.jogadores.find(j => j.id === dados.utilizadorId)
  const outro = dados?.jogadores.find(j => j.id === dados.adversarioId)
  const maximo = Math.max(1, ...(dados?.jornadas || []).flatMap(j => [j.meusPontos, j.outrosPontos]))
  const linhas = eu && outro ? [
    ['Pontos totais', eu.pontos, outro.pontos],
    ['Resultados exatos', eu.exatos, outro.exatos],
    ['Só tendência', eu.soTendencia, outro.soTendencia],
    ['Prognósticos errados', eu.errados, outro.errados],
    ['Prognósticos pontuados', eu.pontuados, outro.pontuados],
    ['Taxa de acerto', taxaAcerto(eu), taxaAcerto(outro)],
    ['Terminados sem prognóstico', eu.semPrognostico, outro.semPrognostico],
  ] : []

  function escolher(epoca, adversario) {
    setSelecao({ competicaoId, epocaId: epoca || null, adversarioId: adversario || null })
  }

  return (
    <div className="pl-duelo">
      <style>{estilos}</style>
      <h2>Frente a frente</h2>
      <p className="pl-duelo-nota">Compara o teu desempenho com outro participante. Esta comparação não atribui pontos extra nem altera a classificação.</p>
      <div className="pl-duelo-controlos">
        {opcoes?.epocas.length > 0 && <div className="pl-duelo-campo">
          <label htmlFor="pl-duelo-epoca">Época</label>
          <select id="pl-duelo-epoca" value={epocaId || ''} onChange={e => escolher(e.target.value, adversarioEscolhido)}>
            <option value="">Época ativa</option>
            {opcoes.epocas.map(e => <option key={e.id} value={e.id}>{e.nome}{e.teste ? ' — Teste' : ''}</option>)}
          </select>
        </div>}
        {opcoes?.participantes.length > 0 && <div className="pl-duelo-campo">
          <label htmlFor="pl-duelo-participante">Comparar com</label>
          <select id="pl-duelo-participante" value={adversarioEscolhido} onChange={e => escolher(epocaId, e.target.value)}>
            {opcoes.participantes.map((p, indice) => <option key={p.id} value={p.id}>
              {p.nome}{opcoes.participantes.filter(outroNome => outroNome.nome === p.nome).length > 1 ? ` (participante ${indice + 1})` : ''}
            </option>)}
          </select>
        </div>}
        <button type="button" disabled={aCarregar} onClick={() => {
          escolher(epocaId, adversarioEscolhido)
          setAtualizacao(v => v + 1)
        }}>Atualizar</button>
      </div>
      {aCarregar && <p role="status">A carregar comparação...</p>}
      {erro && <div className="pl-duelo-erro" role="alert"><p>{erro}</p>
        <button type="button" onClick={() => { setSelecao(null); setCatalogo(null); setAtualizacao(v => v + 1) }}>Repor seleção</button>
      </div>}
      {dados && <>
        {dados.epoca.teste && <p className="pl-duelo-aviso"><strong>Época de teste: {dados.epoca.nome}</strong><br />Estes dados não contam para o ranking histórico oficial.</p>}
        {!outro && <div className="pl-duelo-painel"><p>Ainda não existe outro participante aprovado nesta competição para comparar contigo.</p></div>}
        {eu && outro && <>
          <section className="pl-duelo-painel">
            <h3>{dados.epoca.nome}</h3>
            <div className="pl-duelo-confronto">
              <div className="pl-duelo-jogador"><h3>{eu.nome} (tu)</h3><strong>{eu.pontos}</strong><span>pontos · {eu.pontuados} prognósticos pontuados</span></div>
              <span aria-hidden="true">VS</span>
              <div className="pl-duelo-jogador outro"><h3>{outro.nome}</h3><strong>{outro.pontos}</strong><span>pontos · {outro.pontuados} prognósticos pontuados</span></div>
            </div>
            <p className="pl-duelo-diferenca">{resumoDiferenca(eu, outro)}</p>
          </section>
          <section className="pl-duelo-painel">
            <h3>Comparação da época</h3>
            <div className="pl-duelo-scroll"><table>
              <thead><tr><th scope="col">Indicador</th><th scope="col">{eu.nome} (tu)</th><th scope="col">{outro.nome}</th></tr></thead>
              <tbody>{linhas.map(([titulo, meu, deles]) => <tr key={titulo}><th scope="row">{titulo}</th><td>{meu}</td><td>{deles}</td></tr>)}</tbody>
            </table></div>
            <p className="pl-duelo-nota">Só contam jogos terminados com resultado registado. A taxa de acerto inclui resultados exatos e tendências corretas, divididos pelos prognósticos pontuados de cada pessoa.
              Podem ter quantidades diferentes de prognósticos. As ausências não são contadas como erros. Os pontos já incluem os jogos bónus.</p>
          </section>
          <section className="pl-duelo-painel">
            <h3>Pontos por jornada</h3>
            {!dados.jornadas.length && <p>Esta época não tem jornadas registadas para comparar.</p>}
            {dados.jornadas.map(j => <div className="pl-duelo-ronda" key={j.id}>
              <h4>{j.nome || `Jornada ${j.numero ?? 'sem número'}`} <span className="pl-duelo-nota">· {j.concluida ? 'Concluída' : `${j.terminados}/${j.jogos} jogos terminados`}</span></h4>
              {[[eu.nome + ' (tu)', j.meusPontos, ''], [outro.nome, j.outrosPontos, 'outro']].map(([nome, pontos, classe]) =>
                <div className="pl-duelo-barra-linha" key={classe || 'eu'}>
                  <span>{nome}</span><div className="pl-duelo-barra-fundo" aria-hidden="true"><div className={`pl-duelo-barra ${classe}`} style={{ width: `${100 * pontos / maximo}%` }} /></div>
                  <strong aria-label={`${pontos} pontos`}>{pontos}</strong>
                </div>)}
            </div>)}
            <p className="pl-duelo-nota">Nas jornadas por concluir, os valores são parciais e incluem apenas os jogos terminados. Usa Atualizar para consultar novos resultados.</p>
          </section>
        </>}
      </>}
    </div>
  )
}
