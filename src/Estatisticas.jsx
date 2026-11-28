import DestaquesEpoca, { EvolucaoClassificacao } from './DestaquesEpoca'
import { competicoes } from './competicoesOficiais'
import { useEffect, useId, useState } from 'react'
import { supabase } from './supabase'

const estilos = `
  .pl-estatisticas {
    color: #f8fafc;
    font-family: Arial, sans-serif;
    width: 100%;
    min-width: 0;
  }

  .pl-estatisticas-controlos { display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-bottom:20px; }
  .pl-estatisticas-controlos select, .pl-estatisticas-controlos button { background:#1b2535; color:#f8fafc; border:1px solid #8f722e; border-radius:10px; padding:12px; font:inherit; max-width:100%; }
  .pl-estatisticas-controlos button { cursor:pointer; }
  .pl-estatisticas-controlos button:disabled { opacity:.5; cursor:wait; }
  .pl-estatisticas-controlos :focus-visible { outline:2px solid #f0d477; outline-offset:3px; }
  .pl-estatisticas-teste { padding:12px 16px; border:1px solid #8f722e; border-radius:10px; color:#f0d477; margin-bottom:20px; line-height:1.6; }
  .pl-estatisticas-jornada { margin-bottom:20px; }
  .pl-estatisticas-jornada strong { overflow-wrap:anywhere; }
  .pl-estatisticas-jornada .pl-estatisticas-barra-fundo { height:18px; }
  .pl-estatisticas-parcial { background:linear-gradient(90deg,#365675,#7fb4e2); }
  .pl-estatisticas * {
    box-sizing: border-box;
  }

  .pl-estatisticas-titulo {
    color: #e8c76a;
    font-size: clamp(22px, 4vw, 28px);
    margin: 0 0 10px;
  }

  .pl-estatisticas-separadores {
    display: grid;
    grid-template-columns: .9fr 1.25fr .95fr;
    gap: 6px;
    margin-bottom: 16px;
    max-width: 420px;
  }

  .pl-estatisticas .pl-estatisticas-separadores button[role="tab"] {
    min-width: 0;
    min-height: 44px;
    padding: 6px 3px;
    border: 1px solid #39475c;
    border-radius: 10px;
    background: #1b2535;
    color: #f8fafc;
    font: inherit;
    font-size: clamp(12px, 3.6vw, 15px);
    cursor: pointer;
  }

  .pl-estatisticas-separadores button[aria-selected="true"] {
    background: #f0d477;
    border-color: transparent;
    color: #261d0c;
    font-weight: bold;
  }

  .pl-estatisticas-separadores button:focus-visible,
  .pl-estatisticas [role="tabpanel"]:focus-visible,
  .pl-estatisticas details summary:focus-visible {
    outline: 2px solid #f0d477;
    outline-offset: 3px;
  }

  .pl-estatisticas [role="tabpanel"] { min-width: 0; }
  .pl-estatisticas [role="tabpanel"] > .pl-estatisticas-destaque-grid { margin-bottom: 14px; }
  .pl-estatisticas details summary { color: #e8c76a; cursor: pointer; font-weight: bold; }
  .pl-estatisticas details[open] summary { margin-bottom: 18px; }

  .pl-estatisticas-destaque-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 15px;
  }

  .pl-estatisticas-destaque-item {
    background: #0d1523;
    border: 1px solid #594821;
    border-radius: 13px;
    padding: 20px 12px;
    text-align: center;
  }

  .pl-estatisticas-destaque-item strong {
    display: block;
    font-size: clamp(24px, 4vw, 34px);
    color: #f0d477;
    margin-bottom: 9px;
  }

  .pl-estatisticas-destaque-item span {
    color: #94a3b8;
    font-size: 12px;
  }

  .pl-estatisticas-totais { display: grid; margin: 0 0 20px; }
  .pl-estatisticas-totais div { display: flex; justify-content: space-between; gap: 8px; padding: 7px 0; }
  .pl-estatisticas-totais dd { margin: 0; color: #f0d477; }

  .pl-estatisticas-analise {
    background: #111827;
    border: 1px solid #3d3b30;
    border-radius: 18px;
    padding: 25px;
    margin-bottom: 25px;
  }

  .pl-estatisticas-desempenho { padding: 0; list-style: none; margin: 0 0 12px; }
  .pl-estatisticas-desempenho li {
    display: grid; gap: 6px; padding: 10px 0; border-bottom: 1px solid #39475c;
  }

  .pl-estatisticas-analise h3 {
    color: #e8c76a;
    font-size: 19px;
    margin: 0 0 22px;
  }

  .pl-estatisticas-barra-linha {
    margin-bottom: 23px;
  }

  .pl-estatisticas-barra-linha:last-child {
    margin-bottom: 0;
  }

  .pl-estatisticas-barra-topo {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 13px;
  }

  .pl-estatisticas-barra-topo span {
    color: #cbd5e1;
  }

  .pl-estatisticas-barra-topo strong {
    color: #f0d477;
  }

  .pl-estatisticas-barra-fundo {
    height: 12px;
    background: #29384d;
    border-radius: 20px;
    overflow: hidden;
  }

  .pl-estatisticas-barra-progresso {
    height: 100%;
    background: linear-gradient(90deg, #98741f, #f0d477);
    border-radius: 20px;
    transition: width .4s;
  }

  .pl-estatisticas-nota {
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.8;
    margin-top: 20px;
  }

  .pl-estatisticas-vazio {
    padding: 25px;
    background: #111827;
    border: 1px dashed #594821;
    border-radius: 14px;
    color: #94a3b8;
    text-align: center;
  }

  .pl-estatisticas-erro {
    padding: 16px;
    background: #ef444410;
    border: 1px solid #ef444460;
    border-radius: 10px;
    color: #fca5a5;
  }

  .pl-destaques-lista { padding: 0; list-style: none; margin: 12px 0; }
  .pl-destaques-lista li { padding: 10px 0; border-bottom: 1px solid #39475c; overflow-wrap: anywhere; }
  .pl-destaques-lista li strong { color: #f0d477; }
  .pl-destaques-grafico { overflow-x: auto; margin: 12px 0; padding-bottom: 8px; }
  .pl-destaques-curva { position: relative; height: 190px; }
  .pl-destaques-curva svg { position: absolute; inset: 0; }
  .pl-destaques-ponto {
    position: absolute; transform: translate(-50%, -50%); cursor: pointer; color: #f8fafc;
    background: #26334a; border: 1px solid #f0d477; border-radius: 12px; min-width: 44px; min-height: 44px;
  }
  .pl-destaques-ponto[aria-pressed="true"] { color: #221a0d; background: #f0d477; font-weight: bold; }
  .pl-destaques-ponto:focus-visible { outline: 2px solid #f8fafc; outline-offset: 3px; }
  .pl-destaques-jornada { position: absolute; top: 159px; transform: translateX(-50%); color: #a7b5c9; font-size: 12px; }
  .pl-destaques-valor { margin-bottom: 4px; }

  @media (max-width: 600px) {
    .pl-estatisticas-analise { padding: 14px; margin-bottom: 14px; }
    .pl-estatisticas-analise h3 { margin-bottom: 12px; }
    .pl-estatisticas-destaque-grid { gap: 6px; }
    .pl-estatisticas-destaque-item { padding: 9px 4px; }
    .pl-estatisticas-destaque-item strong { margin-bottom: 4px; font-size: clamp(20px, 5.6vw, 28px); }
    .pl-estatisticas-destaque-item span { font-size: 11px; }
  }
`

function percentagem(valor, total) {
  return total > 0 ? `${(100 * valor / total).toFixed(1).replace('.', ',')}%` : '—'
}

function obterMelhoresJornadas(jornadas) {
  const concluidas = jornadas.filter(j => j.concluida && j.pontuados > 0)
  if (!concluidas.length) return []
  const maximo = Math.max(...concluidas.map(j => j.pontos))
  return concluidas.filter(j => j.pontos === maximo)
}

function validarDados(data, competicaoId, userId, epocaId) {
  if (!data || data.versao !== 1 || data.competicaoId !== competicaoId ||
      data.utilizadorId !== userId || !data.epoca?.id ||
      (epocaId && data.epoca.id !== epocaId) ||
      !Array.isArray(data.epocas) || !Array.isArray(data.jornadas) || !data.resumo) {
    throw new Error('A resposta das estatísticas não corresponde à seleção atual.')
  }
  const campos = ['totalJogos', 'jogosPontuados', 'pontos', 'exatos', 'soTendencia', 'errados',
    'semPrognostico', 'bonusPontuados', 'bonusPontos', 'bonusExatos', 'bonusSoTendencia', 'bonusErrados']
  for (const campo of campos) {
    if (!Number.isSafeInteger(data.resumo[campo]) || data.resumo[campo] < 0) {
      throw new Error('Foram recebidas estatísticas inválidas. Tenta atualizar.')
    }
  }
  const r = data.resumo
  if (r.exatos + r.soTendencia + r.errados !== r.jogosPontuados ||
      r.bonusExatos + r.bonusSoTendencia + r.bonusErrados !== r.bonusPontuados) {
    throw new Error('Os totais das estatísticas não coincidem. Tenta atualizar.')
  }
  return data
}

const nomesCompeticoes = Object.fromEntries(competicoes)

function DesempenhoPrognosticos({ competicaoId, epocaId }) {
  const [estado, setEstado] = useState(null)
  const [grupo, setGrupo] = useState('equipas')
  const [ordem, setOrdem] = useState('pontos')
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const dados = estado?.dados

  useEffect(() => {
    const pedido = new AbortController()
    async function carregar() {
      const { data, error } = await supabase.rpc('obter_desempenho_prognosticos', {
        p_competition_id: competicaoId, p_season_id: epocaId,
      }).abortSignal(pedido.signal)
      if (!pedido.signal.aborted) {
        const valido = !error && Array.isArray(data?.equipas) && Array.isArray(data?.competicoes)
        setEstado(valido ? { dados: data } : { erro: true })
      }
    }
    void carregar()
    return () => pedido.abort()
  }, [competicaoId, epocaId, tentativa])

  const linhas = [...(dados?.[grupo] || [])]
  if (ordem === 'acertos') {
    linhas.sort((a, b) => b.acertos / b.jogos - a.acertos / a.jogos || b.jogos - a.jogos)
  }

  return (
    <section className="pl-estatisticas-analise" aria-labelledby="pl-estatisticas-desempenho">
      <h3 id="pl-estatisticas-desempenho">Onde ganhas mais pontos</h3>
      {!estado && <p role="status">A carregar o desempenho…</p>}
      {estado?.erro && (
        <div className="pl-estatisticas-controlos">
          <p role="alert">Não foi possível carregar o desempenho.</p>
          <button type="button" onClick={() => {
            setEstado(null)
            setTentativa(valor => valor + 1)
          }}>Tentar novamente</button>
        </div>
      )}
      {dados && !dados.equipas.length && !dados.competicoes.length &&
        <p>Ainda não tens prognósticos pontuados nesta época.</p>}
      {dados && linhas.length > 0 && (
        <>
          <div className="pl-estatisticas-controlos">
            <label htmlFor="pl-desempenho-grupo">Agrupar por</label>
            <select id="pl-desempenho-grupo" value={grupo} onChange={e => {
              setGrupo(e.target.value)
              setMostrarTodas(false)
            }}>
              <option value="equipas">Equipa</option>
              <option value="competicoes">Competição de futebol</option>
            </select>
            <label htmlFor="pl-desempenho-ordem">Ordenar por</label>
            <select id="pl-desempenho-ordem" value={ordem} onChange={e => setOrdem(e.target.value)}>
              <option value="pontos">Pontos</option>
              <option value="acertos">Taxa de acerto</option>
            </select>
          </div>
          <ul className="pl-estatisticas-desempenho">
            {(mostrarTodas ? linhas : linhas.slice(0, 10)).map(linha => (
              <li key={linha.chave}>
                <div className="pl-estatisticas-barra-topo">
                  <strong>{linha.nome || (linha.chave ? nomesCompeticoes[linha.chave] || linha.chave : 'Sem competição oficial associada')}</strong>
                  <strong>{linha.pontos} {linha.pontos === 1 ? 'ponto' : 'pontos'}</strong>
                </div>
                <span>{linha.acertos} {linha.acertos === 1 ? 'acerto' : 'acertos'} em {linha.jogos} {linha.jogos === 1 ? 'jogo' : 'jogos'}
                  {' · '}{percentagem(linha.acertos, linha.jogos)}{' · '}{linha.exatos} {linha.exatos === 1 ? 'exato' : 'exatos'}</span>
              </li>
            ))}
          </ul>
          {linhas.length > 10 && <div className="pl-estatisticas-controlos">
            <button type="button" onClick={() => setMostrarTodas(valor => !valor)}>
              {mostrarTodas ? 'Mostrar menos' : `Mostrar todas (${linhas.length})`}
            </button>
          </div>}
          <p className="pl-estatisticas-nota">
            Só contam jogos com prognóstico pontuado. Os acertos incluem resultados exatos e tendências certas.
            {grupo === 'equipas' && ' Cada jogo conta no desempenho das duas equipas.'}
          </p>
        </>
      )}
    </section>
  )
}

const separadores = [
  ['resumo', 'Resumo'],
  ['desempenho', 'Desempenho'],
  ['destaques', 'Destaques'],
]

function SecaoDestaques({ estado, tentar, children }) {
  if (!estado) return <p role="status">A carregar dados da época…</p>
  if (estado.erro) return (
    <div className="pl-estatisticas-controlos">
      <p role="alert">Não foi possível carregar os dados da época.</p>
      <button type="button" onClick={tentar}>Tentar novamente</button>
    </div>
  )
  return children(estado.dados)
}

function PaineisEstatisticas({ competicaoId, dados, aba, id, desempenhoVisitado }) {
  const epocaId = dados.epoca.id
  const [estado, setEstado] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const pedido = new AbortController()
    async function carregar() {
      const { data, error } = await supabase.rpc('obter_destaques_epoca', {
        p_competition_id: competicaoId, p_season_id: epocaId,
      }).abortSignal(pedido.signal)
      if (!pedido.signal.aborted) {
        const valido = !error && Array.isArray(data?.contraCorrente?.jogos) &&
          Array.isArray(data?.evolucao) && Array.isArray(data?.recordes)
        setEstado(valido ? { dados: data } : { erro: true })
      }
    }
    void carregar()
    return () => pedido.abort()
  }, [competicaoId, epocaId, tentativa])

  function tentar() {
    setEstado(null)
    setTentativa(valor => valor + 1)
  }

  const resumo = dados.resumo
  const melhores = obterMelhoresJornadas(dados.jornadas)
  const maximoJornada = Math.max(1, ...dados.jornadas.map(j => j.pontos))
  const nomeJornada = j => j.nome || (j.numero == null ? 'Sem número' : `Jornada ${j.numero}`)

  return (
    <>
      <section id={`${id}-painel-resumo`} aria-labelledby={`${id}-aba-resumo`}
        role="tabpanel" tabIndex={0} hidden={aba !== 'resumo'}>
        <div className="pl-estatisticas-destaque-grid">
          <div className="pl-estatisticas-destaque-item"><strong>{resumo.pontos}</strong><span>Pontos</span></div>
          <div className="pl-estatisticas-destaque-item"><strong>{resumo.jogosPontuados > 0 && dados.posicao != null ? `${dados.posicao}.º` : '—'}</strong><span>Posição</span></div>
          <div className="pl-estatisticas-destaque-item"><strong>{percentagem(resumo.exatos + resumo.soTendencia, resumo.jogosPontuados)}</strong><span>Taxa de acerto</span></div>
        </div>
        <SecaoDestaques estado={estado} tentar={tentar}>
          {destaques => <EvolucaoClassificacao jornadas={destaques.evolucao} visivel={aba === 'resumo'} />}
        </SecaoDestaques>
        {resumo.totalJogos === 0 && <p className="pl-estatisticas-vazio">Esta época ainda não tem jogos registados.</p>}
        {resumo.totalJogos > 0 && resumo.jogosPontuados === 0 && <p className="pl-estatisticas-vazio">Ainda não tens prognósticos pontuados nesta época.</p>}
      </section>

      <section id={`${id}-painel-desempenho`} aria-labelledby={`${id}-aba-desempenho`}
        role="tabpanel" tabIndex={0} hidden={aba !== 'desempenho'}>
        {desempenhoVisitado && <DesempenhoPrognosticos competicaoId={competicaoId} epocaId={epocaId} />}
        <details className="pl-estatisticas-analise">
          <summary>Pontos por jornada</summary>
          {!dados.jornadas.length && <p>Não existem jornadas registadas nesta época.</p>}
          {dados.jornadas.map(j => <div className="pl-estatisticas-jornada" key={j.id}>
            <div className="pl-estatisticas-barra-topo"><span>{nomeJornada(j)} · {j.concluida ? 'Concluída' : 'Por concluir'}</span>
              <strong>{j.pontos} pontos</strong></div>
            <div className="pl-estatisticas-barra-fundo" aria-hidden="true"><div
              className={`pl-estatisticas-barra-progresso${j.concluida ? '' : ' pl-estatisticas-parcial'}`}
              style={{ width: `${100 * j.pontos / maximoJornada}%` }} /></div>
            <small>{j.pontuados} prognósticos pontuados · {j.jogos} jogos na jornada</small>
          </div>)}
          <p className="pl-estatisticas-nota">As jornadas por concluir apresentam pontos parciais. Atualiza para consultar novos resultados.</p>
          <h3>Melhor jornada</h3>
          {melhores.length ? <p>{melhores.map(nomeJornada).join(' · ')} — <strong>{melhores[0].pontos} pontos</strong></p> :
            <p>Ainda não existem jornadas concluídas com prognósticos teus pontuados.</p>}
          <p className="pl-estatisticas-nota">Comparação por pontos, apenas entre jornadas concluídas. Em caso de empate, aparecem todas.</p>
        </details>
        <details className="pl-estatisticas-analise">
          <summary>Jogos bónus</summary>
          {resumo.bonusPontuados === 0 ? <p>Ainda não tens prognósticos pontuados em jogos bónus nesta época.</p> : <>
            <div className="pl-estatisticas-destaque-grid">
              <div className="pl-estatisticas-destaque-item"><strong>{resumo.bonusPontos}</strong><span>Pontos em jogos bónus</span></div>
              <div className="pl-estatisticas-destaque-item"><strong>{resumo.bonusPontuados}</strong><span>Prognósticos pontuados</span></div>
              <div className="pl-estatisticas-destaque-item"><strong>{percentagem(resumo.bonusExatos + resumo.bonusSoTendencia, resumo.bonusPontuados)}</strong><span>Taxa de acerto</span></div>
            </div>
            <p className="pl-estatisticas-nota">Exatos: {resumo.bonusExatos} · Só tendência: {resumo.bonusSoTendencia} · Errados: {resumo.bonusErrados}.
              Os pontos apresentados já incluem o multiplicador dos jogos bónus.</p>
          </>}
        </details>
        <details className="pl-estatisticas-analise">
          <summary>Distribuição dos prognósticos</summary>
          <dl className="pl-estatisticas-totais">
            <div><dt>Jogos pontuados</dt><dd>{resumo.jogosPontuados}</dd></div>
            <div><dt>Precisão do resultado exato</dt><dd>{percentagem(resumo.exatos, resumo.jogosPontuados)}</dd></div>
            <div><dt>Pontos para o líder</dt><dd>{dados.pontosLider == null ? '—' : Math.max(0, dados.pontosLider - resumo.pontos)}</dd></div>
          </dl>
          {[
            ['Resultado exato', resumo.exatos], ['Só tendência', resumo.soTendencia], ['Errado', resumo.errados],
          ].map(([nome, total]) => <div className="pl-estatisticas-barra-linha" key={nome}>
            <div className="pl-estatisticas-barra-topo"><span>{nome}</span><strong>{total} · {percentagem(total, resumo.jogosPontuados)}</strong></div>
            <div className="pl-estatisticas-barra-fundo" aria-hidden="true"><div className="pl-estatisticas-barra-progresso"
              style={{ width: `${resumo.jogosPontuados > 0 ? 100 * total / resumo.jogosPontuados : 0}%` }} /></div>
          </div>)}
          <p className="pl-estatisticas-nota">A taxa de acerto inclui resultados exatos e tendências certas. Jogos terminados sem prognóstico: <strong>{resumo.semPrognostico}</strong>.</p>
        </details>
      </section>

      <section id={`${id}-painel-destaques`} aria-labelledby={`${id}-aba-destaques`}
        role="tabpanel" tabIndex={0} hidden={aba !== 'destaques'}>
        <SecaoDestaques estado={estado} tentar={tentar}>
          {destaques => <DestaquesEpoca dados={destaques} />}
        </SecaoDestaques>
      </section>
    </>
  )
}

export default function Estatisticas({ competicaoId }) {
  const id = useId()
  const [aba, setAba] = useState('resumo')
  const [desempenhoVisitado, setDesempenhoVisitado] = useState(false)
  const [selecao, setSelecao] = useState(null)
  const [atualizacao, setAtualizacao] = useState(0)
  const [estado, setEstado] = useState(null)
  const epocaId = selecao?.competicaoId === competicaoId ? selecao.id : null
  const chave = `${competicaoId || ''}:${epocaId || 'ativa'}:${atualizacao}`

  useEffect(() => {
    const controller = new AbortController()
    let ativo = true
    async function carregar() {
      try {
        if (!competicaoId) {
          throw new Error('Não foi possível identificar a competição. Volta ao painel e abre novamente as estatísticas.')
        }
        const { data: auth, error: erroAuth } = await supabase.auth.getUser()
        if (!ativo) return
        if (erroAuth || !auth?.user) throw new Error('Inicia sessão para consultar as tuas estatísticas.')
        const { data, error } = await supabase.rpc('obter_estatisticas_avancadas', {
          p_competition_id: competicaoId,
          p_season_id: epocaId,
        }).abortSignal(controller.signal)
        if (!ativo) return
        if (error) {
          if (error.code === 'P0002') throw new Error('Não existe uma época disponível para esta seleção.')
          if (error.code === 'P0003') throw new Error('Existe mais de uma época ativa. O administrador deve verificar as épocas.')
          throw error
        }
        const dados = validarDados(data, competicaoId, auth.user.id, epocaId)
        setEstado({ chave, competicaoId, dados, erro: '' })
      } catch (erro) {
        if (ativo) setEstado({ chave, competicaoId, dados: null,
          erro: erro.message || 'Não foi possível carregar as estatísticas.' })
      }
    }
    carregar()
    return () => { ativo = false; controller.abort() }
  }, [competicaoId, epocaId, atualizacao, chave])

  const aCarregar = estado?.chave !== chave
  const erro = !aCarregar ? estado?.erro : ''
  const dados = !aCarregar && !erro ? estado?.dados : null
  // Mantém o seletor utilizável durante um carregamento, sem mostrar totais antigos.
  const epocas = estado?.competicaoId === competicaoId ? estado.dados?.epocas || [] : []
  function selecionarAba(novaAba) {
    setAba(novaAba)
    if (novaAba === 'desempenho') setDesempenhoVisitado(true)
  }

  function navegarPorTeclado(evento, indice) {
    const total = separadores.length
    const destinos = { ArrowLeft: (indice + total - 1) % total, ArrowRight: (indice + 1) % total, Home: 0, End: total - 1 }
    const destino = destinos[evento.key]
    if (destino == null) return
    evento.preventDefault()
    const [novaAba] = separadores[destino]
    selecionarAba(novaAba)
    document.getElementById(`${id}-aba-${novaAba}`)?.focus()
  }

  return (
    <div className="pl-estatisticas pl-secao">
      <style>{estilos}</style>
      <h2 className="pl-estatisticas-titulo">Estatísticas</h2>
      <div className="pl-estatisticas-controlos">
        {epocas.length > 0 && <>
          <label htmlFor="pl-estatisticas-epoca">Época</label>
          <select id="pl-estatisticas-epoca" value={epocaId || ''}
            onChange={e => setSelecao({ competicaoId, id: e.target.value || null })}>
            <option value="">{(!epocaId && dados?.epoca.nome) || 'Época ativa'}</option>
            {epocas.map(epoca => <option key={epoca.id} value={epoca.id}>
              {epoca.nome}{epoca.teste ? ' — Teste' : ''}
            </option>)}
          </select>
        </>}
        <button type="button" disabled={aCarregar} onClick={() => setAtualizacao(v => v + 1)}>Atualizar</button>
      </div>
      {aCarregar && <p role="status">A carregar estatísticas...</p>}
      {erro && <div className="pl-estatisticas-erro" role="alert">{erro}</div>}
      {dados && <>
        {dados.epoca.teste && <div className="pl-estatisticas-teste">
          <strong>Época de teste: {dados.epoca.nome}</strong><br />
          Estes dados servem para validar a aplicação e não contam para o ranking histórico oficial.
        </div>}
        <div className="pl-estatisticas-separadores" role="tablist" aria-label="Estatísticas">
          {separadores.map(([valor, nome], indice) => (
            <button id={`${id}-aba-${valor}`} key={valor} type="button" role="tab"
              aria-selected={aba === valor} aria-controls={`${id}-painel-${valor}`}
              tabIndex={aba === valor ? 0 : -1}
              onClick={() => selecionarAba(valor)} onKeyDown={evento => navegarPorTeclado(evento, indice)}>
              {nome}
            </button>
          ))}
        </div>
        <PaineisEstatisticas key={chave} id={id} aba={aba} dados={dados}
          competicaoId={competicaoId} desempenhoVisitado={desempenhoVisitado} />
      </>}
    </div>
  )
}
