import { useState } from 'react'
import { supabase } from './supabase'
import { anoDaEpoca, competicoes } from './competicoesOficiais'
import EmblemaEquipa from './EmblemaEquipa'

export default function CorrigirEmblema({ jogo, lado, aoFechar, aoGuardar, ocupado }) {
  const campoId = `emblema-${jogo.id}-${lado}`
  const nome = lado === 'casa' ? jogo.home_team : jogo.away_team
  const competicaoLigada = jogo.football_data_competition
  const [competicao, setCompeticao] = useState(competicaoLigada || '')
  const [ano, setAno] = useState(() => anoDaEpoca(new Date(jogo.kickoff)))
  const [clubes, setClubes] = useState(null)
  const [clubeId, setClubeId] = useState('')
  const [aPedir, setAPedir] = useState(false)
  const [erro, setErro] = useState('')
  const clube = clubes?.find(item => String(item.id) === clubeId)

  function limparClubes() {
    setClubes(null)
    setClubeId('')
    setErro('')
  }

  async function executar(guardar) {
    setAPedir(true)
    setErro('')
    try {
      const body = { epocaId: jogo.season_id, competicao, ano: Number(ano), acao: 'clubes' }
      if (guardar) Object.assign(body, {
        acao: 'corrigir-emblema', jogoId: jogo.id, lado, nome, clubeId: clube.id,
      })
      const { data, error } = await supabase.functions.invoke('sincronizar-calendario', { body })
      if (error || (guardar ? !Number.isInteger(data?.jogosAtualizados) : !Array.isArray(data?.clubes))) {
        const resposta = error?.context instanceof Response ? await error.context.json().catch(() => null) : null
        throw new Error(resposta?.erro || 'Não foi possível concluir o pedido de emblemas.')
      }
      if (guardar) await aoGuardar(nome)
      else {
        setClubes(data.clubes)
        setClubeId('')
      }
    } catch (e) {
      setErro(e.message)
    } finally {
      setAPedir(false)
    }
  }

  return (
    <form className="pl-jornadas-form-extra" onSubmit={e => { e.preventDefault(); executar(false) }}>
      <h4>Corrigir emblema de {nome}</h4>
      <div className="pl-jornadas-campos">
        <div className="pl-jornadas-campo">
          <label htmlFor={`${campoId}-competicao`}>Competição oficial</label>
          <select id={`${campoId}-competicao`} className="pl-jornadas-input" value={competicao} required
            disabled={aPedir || ocupado || !!competicaoLigada}
            onChange={e => { setCompeticao(e.target.value); limparClubes() }}>
            <option value="">Escolhe a competição</option>
            {competicoes.map(([codigo, nome]) => <option value={codigo} key={codigo}>{nome}</option>)}
          </select>
        </div>
        <div className="pl-jornadas-campo">
          <label htmlFor={`${campoId}-ano`}>Ano de início da época</label>
          <input id={`${campoId}-ano`} className="pl-jornadas-input" type="number" min="2000" max="2100" value={ano} required
            disabled={aPedir || ocupado} onChange={e => { setAno(e.target.value); limparClubes() }} />
        </div>
      </div>
      <button type="submit" className="pl-jornadas-botao-secundario" disabled={aPedir || ocupado || !competicao}>
        Carregar clubes
      </button>
      {clubes?.length === 0 && <p role="status">Não há clubes com emblema disponível nesta época.</p>}
      {clubes?.length > 0 && (
        <div className="pl-jornadas-campo">
          <label htmlFor={`${campoId}-clube`}>Clube oficial</label>
          <select id={`${campoId}-clube`} className="pl-jornadas-input" value={clubeId} disabled={aPedir || ocupado}
            onChange={e => setClubeId(e.target.value)}>
            <option value="">Escolhe o clube</option>
            {clubes.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </div>
      )}
      {clube && <p><EmblemaEquipa nome={clube.nome} origem={clube.emblema} /> {clube.nome}</p>}
      {erro && <p role="alert">{erro}</p>}
      <div className="pl-jornadas-acoes">
        <button type="button" className="pl-jornadas-botao" disabled={aPedir || ocupado || !clube}
          onClick={() => executar(true)}>Guardar correspondência</button>
        <button type="button" className="pl-jornadas-botao-secundario"
          disabled={aPedir} onClick={aoFechar}>Cancelar</button>
        {aPedir && <span role="status">A aguardar resposta…</span>}
      </div>
    </form>
  )
}
