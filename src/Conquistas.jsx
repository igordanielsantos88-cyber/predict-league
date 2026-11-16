import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const estilos = `
.pl-conquistas { color:#e2e8f0; line-height:1.6; }
.pl-conquistas * { box-sizing:border-box; }
.pl-conquistas h3 { color:#e8c76a; margin:0 0 10px; }
.pl-conquistas p { color:#a7b5c9; }
.pl-conquistas .pc-controlos { display:flex; align-items:end; flex-wrap:wrap; gap:14px; margin:20px 0; }
.pl-conquistas label { display:flex; flex-direction:column; gap:6px; flex:1; min-width:160px; }
.pl-conquistas select,.pl-conquistas button { background:#1b2535; color:#e8c76a; border:1px solid #594821; padding:11px 14px; border-radius:10px; font:inherit; }
.pl-conquistas button { cursor:pointer; }
.pl-conquistas button:disabled { opacity:.55; cursor:wait; }
.pl-conquistas button:focus-visible,.pl-conquistas select:focus-visible { outline:2px solid #e8c76a; outline-offset:3px; }
.pl-conquistas .pc-cartoes { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin:22px 0; }
.pl-conquistas .pc-cartao { padding:22px; border:1px solid #3d4656; border-radius:16px; background:#101827; min-width:0; overflow-wrap:anywhere; }
.pl-conquistas .pc-obtida { border-color:#b4943d; background:linear-gradient(145deg,#252419,#111b2a); }
.pl-conquistas .pc-icone { font-size:36px; display:block; margin-bottom:12px; }
.pl-conquistas .pc-estado { display:inline-block; border:1px solid #546275; border-radius:20px; padding:3px 10px; font-size:13px; color:#cbd5e1; }
.pl-conquistas .pc-obtida .pc-estado { color:#fde68a; border-color:#8f722e; }
.pl-conquistas progress { width:100%; height:10px; accent-color:#d4af37; }
.pl-conquistas .pc-aviso { border:1px solid #41516a; background:#152033; padding:16px; border-radius:12px; }
.pl-conquistas .pc-erro { color:#fca5a5; }
.pl-conquistas .pc-lista { list-style:none; padding:0; display:grid; gap:10px; }
.pl-conquistas .pc-lista li { padding:14px 18px; border:1px solid #594821; border-radius:12px; background:#101827; }
.pl-conquistas .pc-lista span { display:block; color:#a7b5c9; }
@media(max-width:800px) { .pl-conquistas .pc-cartoes { grid-template-columns:1fr; } }
`

function validarConquistas(dados, competicaoId, utilizadorId, epocaId) {
  const inteiro = n => Number.isSafeInteger(n) && n >= 0
  const epocaValida = e => e && typeof e.id === 'string' && typeof e.nome === 'string' && ['active', 'completed'].includes(e.estado)
  if (!dados || dados.versao !== 1 || dados.competicaoId !== competicaoId || dados.utilizadorId !== utilizadorId ||
    !Array.isArray(dados.epocas) || !dados.epocas.every(epocaValida) ||
    new Set(dados.epocas.map(e => e.id)).size !== dados.epocas.length ||
    !inteiro(dados.exatos) || !inteiro(dados.jogosRegistados) || dados.exatos > dados.jogosRegistados ||
    dados.objetivoEspecialista !== 10 || dados.primeiroPleno !== (dados.exatos >= 1) || dados.especialista !== (dados.exatos >= 10) ||
    !Array.isArray(dados.jornadasCampeao) || !dados.jornadasCampeao.every(j =>
      typeof j.id === 'string' && (j.nome === null || typeof j.nome === 'string') &&
      (j.numero === null || Number.isInteger(j.numero)) && inteiro(j.pontos) && inteiro(j.exatos) && typeof j.partilhada === 'boolean') ||
    new Set(dados.jornadasCampeao.map(j => j.id)).size !== dados.jornadasCampeao.length) {
    throw new Error('A resposta das conquistas não é válida. Tenta atualizar.')
  }
  if (dados.epoca === null) {
    if (epocaId || dados.epocas.length || dados.exatos || dados.jogosRegistados || dados.jornadasCampeao.length) throw new Error('A época recebida não corresponde à seleção.')
  } else if (!epocaValida(dados.epoca) || !dados.epocas.some(e => e.id === dados.epoca.id) || (epocaId && epocaId !== dados.epoca.id)) {
    throw new Error('A época recebida não corresponde à seleção.')
  }
  return dados
}

export default function Conquistas({ competicaoId }) {
  const [selecao, setSelecao] = useState(null)
  const [atualizacao, setAtualizacao] = useState(0)
  const [resposta, setResposta] = useState(null)
  const [catalogo, setCatalogo] = useState(null)
  const epocaId = selecao?.competicaoId === competicaoId ? selecao?.epocaId ?? null : null
  const chave = JSON.stringify([competicaoId, epocaId, atualizacao])
  const atual = resposta?.chave === chave ? resposta : null
  const dados = atual?.dados
  const erro = atual?.erro
  const aCarregar = !!competicaoId && !atual
  const epocas = catalogo?.competicaoId === competicaoId ? catalogo?.epocas ?? [] : []

  useEffect(() => {
    if (!competicaoId) return
    const controller = new AbortController()
    let ativo = true
    async function carregar() {
      try {
        const { data: sessao, error: erroSessao } = await supabase.auth.getUser()
        if (!ativo) return
        if (erroSessao || !sessao?.user) throw new Error('Inicia sessão novamente para consultar as tuas conquistas.')
        const { data, error } = await supabase.rpc('obter_conquistas', {
          p_competition_id: competicaoId, p_season_id: epocaId,
        }).abortSignal(controller.signal)
        if (!ativo) return
        if (error) throw new Error(error.code === '42501'
          ? 'Não tens acesso à competição ou à época selecionada.'
          : 'Não foi possível carregar as conquistas. Tenta novamente.')
        const resultado = validarConquistas(data, competicaoId, sessao.user.id, epocaId)
        setCatalogo({ competicaoId, epocas: resultado.epocas })
        setResposta({ chave, dados: resultado })
      } catch (error) {
        if (ativo) setResposta({ chave, erro: error.message || 'Não foi possível carregar as conquistas.' })
      }
    }
    carregar()
    return () => { ativo = false; controller.abort() }
  }, [competicaoId, epocaId, chave])

  const semEpoca = dados && !dados.epoca
  const cartoes = [
    { nome: 'Primeiro pleno', icone: '🎯', regra: 'Acerta o resultado exato de um jogo nesta época.', obtida: dados?.primeiroPleno,
      detalhe: dados ? `${dados.exatos} ${dados.exatos === 1 ? 'resultado exato' : 'resultados exatos'}` : '' },
    { nome: 'Especialista', icone: '🔥', regra: 'Consegue 10 resultados exatos na mesma época.', obtida: dados?.especialista,
      detalhe: dados ? `${Math.min(dados.exatos, 10)} / 10 resultados exatos` : '', progresso: true },
    { nome: 'Campeão da jornada', icone: '🏆', regra: 'Termina uma jornada concluída em primeiro por pontos e depois resultados exatos.', obtida: dados?.jornadasCampeao.length > 0,
      detalhe: dados ? `${dados.jornadasCampeao.length} ${dados.jornadasCampeao.length === 1 ? 'jornada conquistada' : 'jornadas conquistadas'}` : '' },
  ]

  return (
    <section className="pl-conquistas" aria-label="As minhas conquistas" aria-busy={aCarregar}>
      <style>{estilos}</style>
      <h3>As minhas conquistas</h3>
      <p>Cada época é um novo desafio. Acompanha as tuas medalhas e o progresso para a próxima conquista.</p>
      <div className="pc-controlos">
        {epocas.length > 0 && <label htmlFor="pc-epoca">Época oficial
          <select id="pc-epoca" value={epocaId ?? ''} onChange={e => setSelecao({ competicaoId, epocaId: e.target.value || null })}>
            <option value="">Automática — oficial ativa ou mais recente</option>
            {epocas.map(e => <option key={e.id} value={e.id}>{e.nome}{e.estado === 'completed' ? ' — concluída' : ''}</option>)}
          </select>
        </label>}
        <button type="button" disabled={aCarregar || !competicaoId} onClick={() => setAtualizacao(n => n + 1)}>Atualizar</button>
      </div>
      {!competicaoId && <p role="alert" className="pc-erro">É necessário identificar a competição.</p>}
      {aCarregar && <p role="status">A carregar conquistas…</p>}
      {erro && <div role="alert" className="pc-erro"><p>{erro}</p>
        <button type="button" onClick={() => { setSelecao(null); setCatalogo(null); setAtualizacao(n => n + 1) }}>Repor seleção</button>
      </div>}
      {dados && <>
        {semEpoca ? <p className="pc-aviso">Ainda não existe uma época oficial ativa ou concluída nesta competição. As épocas de teste não atribuem conquistas. As medalhas ficam disponíveis quando começar a época oficial.</p>
          : <><h3>{dados.epoca.nome}</h3>
            {dados.jogosRegistados === 0 && <p className="pc-aviso">Esta época ainda não tem jogos registados para calcular conquistas. Os totais históricos do Hall da Fama não são usados nesta secção.</p>}
          </>}
        <div className="pc-cartoes">
          {cartoes.map(c => <article key={c.nome} className={`pc-cartao${c.obtida ? ' pc-obtida' : ''}`}>
            <span className="pc-icone" aria-hidden="true">{c.icone}</span>
            <h3>{c.nome}</h3><span className="pc-estado">{semEpoca ? 'A aguardar época oficial' : c.obtida ? 'Conquistada' : 'Por conquistar'}</span>
            <p>{c.regra}</p>
            {!semEpoca && <><strong>{c.detalhe}</strong>
              {c.progresso && <progress aria-label="Progresso para Especialista" value={Math.min(dados.exatos, 10)} max="10" />}</>}
          </article>)}
        </div>
        {dados.jornadasCampeao.length > 0 && <div><h3>As tuas jornadas conquistadas</h3>
          <ul className="pc-lista">{dados.jornadasCampeao.map(j => <li key={j.id}>
            <strong>🏆 {j.nome || (j.numero === null ? 'Jornada' : `Jornada ${j.numero}`)}</strong>
            <span>{j.pontos} pontos · {j.exatos} resultados exatos{j.partilhada ? ' · Medalha partilhada' : ''}</span>
          </li>)}</ul>
        </div>}
      </>}
      <p>Contam apenas épocas oficiais desta competição. Um resultado exato conta uma vez, mesmo num jogo bónus. Em caso de empate nos pontos e nos resultados exatos, a medalha da jornada é partilhada.</p>
      <p>As conquistas são recalculadas ao abrir esta secção ou ao carregar em Atualizar. Uma correção de resultados pode alterar as medalhas atribuídas.</p>
    </section>
  )
}
