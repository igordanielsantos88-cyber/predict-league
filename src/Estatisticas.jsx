
import { useEffect, useState } from 'react'
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

  .pl-estatisticas-subtitulo {
    color: #94a3b8;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 26px;
  }

  .pl-estatisticas-destaque {
    background: linear-gradient(120deg, #1b2535, #302718);
    border: 1px solid #8f722e;
    border-radius: 18px;
    padding: 25px;
    margin-bottom: 28px;
  }

  .pl-estatisticas-destaque h3 {
    color: #e8c76a;
    margin: 0 0 20px;
    font-size: 19px;
  }

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

  .pl-estatisticas-seccao-titulo {
    font-size: 20px;
    color: #f8fafc;
    margin: 0 0 18px;
  }

  .pl-estatisticas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
    gap: 15px;
    margin-bottom: 28px;
  }

  .pl-estatisticas-cartao {
    background: linear-gradient(145deg, #1b2535, #131c2b);
    border: 1px solid #594821;
    border-radius: 16px;
    padding: 23px 16px;
    text-align: center;
    transition: transform .2s, border-color .2s;
  }

  .pl-estatisticas-cartao:hover {
    transform: translateY(-3px);
    border-color: #d4af37;
  }

  .pl-estatisticas-icone {
    font-size: 27px;
    margin-bottom: 13px;
  }

  .pl-estatisticas-cartao-titulo {
    color: #94a3b8;
    font-size: 13px;
    margin-bottom: 13px;
  }

  .pl-estatisticas-cartao-valor {
    color: #f0d477;
    font-size: clamp(25px, 4vw, 32px);
    font-weight: bold;
  }

  .pl-estatisticas-analise {
    background: #111827;
    border: 1px solid #3d3b30;
    border-radius: 18px;
    padding: 25px;
    margin-bottom: 25px;
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

  @media (max-width: 600px) {
    .pl-estatisticas-destaque,
    .pl-estatisticas-analise {
      padding: 17px;
    }

    .pl-estatisticas-destaque-grid {
      gap: 8px;
    }

    .pl-estatisticas-destaque-item {
      padding: 16px 6px;
    }

    .pl-estatisticas-destaque-item span {
      font-size: 11px;
    }

    .pl-estatisticas-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .pl-estatisticas-cartao {
      padding: 19px 10px;
    }
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

export default function Estatisticas({ competicaoId }) {
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
  const resumo = dados?.resumo
  const melhores = obterMelhoresJornadas(dados?.jornadas || [])
  const maximoJornada = Math.max(1, ...(dados?.jornadas || []).map(j => j.pontos))
  const nomeJornada = j => j.nome || (j.numero == null ? 'Sem número' : `Jornada ${j.numero}`)
  const cartoes = resumo ? [
    ['🎯', 'Resultados exatos', resumo.exatos],
    ['⚽', 'Jogos pontuados', resumo.jogosPontuados],
    ['📊', 'Precisão', percentagem(resumo.exatos, resumo.jogosPontuados)],
    ['👑', 'Pontos para o líder', dados.pontosLider == null ? '—' : Math.max(0, dados.pontosLider - resumo.pontos)],
    ['🎯', 'Taxa de acerto', percentagem(resumo.exatos + resumo.soTendencia, resumo.jogosPontuados)],
  ] : []

  return (
    <div className="pl-estatisticas">
      <style>{estilos}</style>
      <h2 className="pl-estatisticas-titulo">📊 As minhas estatísticas</h2>
      <p className="pl-estatisticas-subtitulo">Acompanha os teus pontos e acertos, jornada a jornada.</p>
      <div className="pl-estatisticas-controlos">
        {epocas.length > 0 && <>
          <label htmlFor="pl-estatisticas-epoca">Época</label>
          <select id="pl-estatisticas-epoca" value={epocaId || ''}
            onChange={e => setSelecao({ competicaoId, id: e.target.value || null })}>
            <option value="">Época ativa</option>
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
        <section className="pl-estatisticas-destaque">
          <h3>🏆 Resumo — {dados.epoca.nome}</h3>
          <div className="pl-estatisticas-destaque-grid">
            <div className="pl-estatisticas-destaque-item"><strong>{resumo.jogosPontuados > 0 && dados.posicao != null ? `${dados.posicao}.º` : '—'}</strong><span>Posição na época</span></div>
            <div className="pl-estatisticas-destaque-item"><strong>{resumo.pontos}</strong><span>Pontos totais</span></div>
            <div className="pl-estatisticas-destaque-item"><strong>{dados.pontosLider == null ? '—' : Math.max(0, dados.pontosLider - resumo.pontos)}</strong><span>Pontos para o líder</span></div>
          </div>
        </section>
        {resumo.totalJogos === 0 && <p className="pl-estatisticas-vazio">Esta época ainda não tem jogos registados. Não existem dados detalhados para analisar.</p>}
        {resumo.totalJogos > 0 && resumo.jogosPontuados === 0 && <p className="pl-estatisticas-vazio">Ainda não tens prognósticos pontuados nesta época.</p>}
        <h3 className="pl-estatisticas-seccao-titulo">⚽ Desempenho individual</h3>
        <div className="pl-estatisticas-grid">
          {cartoes.map(([icone, titulo, valor]) => <div className="pl-estatisticas-cartao" key={titulo}>
            <div className="pl-estatisticas-icone" aria-hidden="true">{icone}</div>
            <div className="pl-estatisticas-cartao-titulo">{titulo}</div>
            <div className="pl-estatisticas-cartao-valor">{valor}</div>
          </div>)}
        </div>
        <section className="pl-estatisticas-analise">
          <h3>🎯 Distribuição dos prognósticos</h3>
          {[
            ['Resultado exato', resumo.exatos], ['Só tendência', resumo.soTendencia], ['Errado', resumo.errados],
          ].map(([nome, total]) => <div className="pl-estatisticas-barra-linha" key={nome}>
            <div className="pl-estatisticas-barra-topo"><span>{nome}</span><strong>{total} · {percentagem(total, resumo.jogosPontuados)}</strong></div>
            <div className="pl-estatisticas-barra-fundo" aria-hidden="true"><div className="pl-estatisticas-barra-progresso"
              style={{ width: `${resumo.jogosPontuados > 0 ? 100 * total / resumo.jogosPontuados : 0}%` }} /></div>
          </div>)}
          <p className="pl-estatisticas-nota">As percentagens usam apenas os teus prognósticos pontuados. Só tendência exclui resultados exatos.
            A taxa de acerto inclui ambos. Jogos terminados sem prognóstico: <strong>{resumo.semPrognostico}</strong> — não são contados como erros.</p>
        </section>
        <section className="pl-estatisticas-analise">
          <h3>📈 Pontos por jornada</h3>
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
          <h3>🏅 Melhor jornada</h3>
          {melhores.length ? <p>{melhores.map(nomeJornada).join(' · ')} — <strong>{melhores[0].pontos} pontos</strong></p> :
            <p>Ainda não existem jornadas concluídas com prognósticos teus pontuados.</p>}
          <p className="pl-estatisticas-nota">Comparação por pontos, apenas entre jornadas concluídas. Em caso de empate, aparecem todas.</p>
        </section>
        <section className="pl-estatisticas-analise">
          <h3>⭐ Jogos bónus</h3>
          {resumo.bonusPontuados === 0 ? <p>Ainda não tens prognósticos pontuados em jogos bónus nesta época.</p> : <>
            <div className="pl-estatisticas-destaque-grid">
              <div className="pl-estatisticas-destaque-item"><strong>{resumo.bonusPontos}</strong><span>Pontos em jogos bónus</span></div>
              <div className="pl-estatisticas-destaque-item"><strong>{resumo.bonusPontuados}</strong><span>Prognósticos pontuados</span></div>
              <div className="pl-estatisticas-destaque-item"><strong>{percentagem(resumo.bonusExatos + resumo.bonusSoTendencia, resumo.bonusPontuados)}</strong><span>Taxa de acerto</span></div>
            </div>
            <p className="pl-estatisticas-nota">Exatos: {resumo.bonusExatos} · Só tendência: {resumo.bonusSoTendencia} · Errados: {resumo.bonusErrados}.
              Os pontos apresentados já incluem o multiplicador dos jogos bónus.</p>
          </>}
        </section>
      </>}
    </div>
  )
}
