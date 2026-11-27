import { useState } from 'react'
import { supabase } from './supabase'

const competicoes = [
  ['PL', 'Premier League'],
  ['PD', 'La Liga'],
  ['SA', 'Serie A'],
  ['BL1', 'Bundesliga'],
  ['FL1', 'Ligue 1'],
  ['PPL', 'Liga Portugal'],
  ['CL', 'Champions League'],
  ['EL', 'Liga Europa'],
  ['UECL', 'Liga Conferência'],
]

const hora = new Intl.DateTimeFormat('pt-PT', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Lisbon',
})

const resultados = {
  criado: 'Importado',
  associado: 'Associado ao jogo existente',
  existente: 'Já importado',
  importado_mantido: 'Jogo importado mantido e prognósticos transferidos.',
  importado_protegido: 'Junção bloqueada. Confirma a jornada, o estado dos jogos e se alguém tem prognósticos nos dois.',
  corrigido: 'Cópia removida. O jogo escolhido e os seus prognósticos foram mantidos.',
  protegido: 'A cópia já começou, tem prognósticos, resultado ou bónus. Ambos os jogos foram mantidos.',
  rever: 'O jogo já começou ou a correspondência precisa de revisão.',
  indisponivel: 'Horário deixou de estar disponível.',
}

function anoInicial() {
  const agora = new Date()
  return String(agora.getFullYear() - (agora.getMonth() < 6 ? 1 : 0))
}

export default function ImportarJogosOficiais({ epocaId, jornadas, jogosDaEpoca, atualizarJogos }) {
  const [competicao, setCompeticao] = useState('PL')
  const [ano, setAno] = useState(anoInicial)
  const [jornada, setJornada] = useState('')
  const [jogos, setJogos] = useState(null)
  const [selecionados, setSelecionados] = useState([])
  const [destinos, setDestinos] = useState({})
  const [relatorio, setRelatorio] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  function limparPrevia() {
    setJogos(null)
    setSelecionados([])
    setDestinos({})
    setRelatorio(null)
    setErro('')
  }

  async function executar(acao) {
    if (ocupado) return
    setOcupado(true)
    setErro('')
    setRelatorio(null)
    if (acao === 'listar') {
      setJogos(null)
      setSelecionados([])
      setDestinos({})
    }
    try {
      const body = { acao, epocaId, competicao, ano: Number(ano) }
      if (acao === 'importar') {
        body.jornadaId = jornada
        body.ids = selecionados
        body.destinos = Object.fromEntries(selecionados.map(id => [id, destinos[id]]))
      }
      const { data, error } = await supabase.functions.invoke('sincronizar-calendario', { body })
      if (error || !Array.isArray(data?.jogos)) {
        const resposta = error?.context instanceof Response ? await error.context.json().catch(() => null) : null
        throw new Error(resposta?.erro || 'Não foi possível consultar os jogos oficiais.')
      }
      if (acao === 'listar') {
        setJogos([...data.jogos].sort((a, b) => Date.parse(a.hora) - Date.parse(b.hora)))
      } else {
        setRelatorio(data.jogos)
        setSelecionados([])
        setDestinos({})
        await atualizarJogos()
      }
    } catch (error) {
      setErro(error.message)
    } finally {
      setOcupado(false)
    }
  }

  const opcoes = jogosDaEpoca.filter(jogo => jogo.jornada_id === jornada && jogo.status === 'scheduled')
  const acoesEscolhidas = selecionados.map(id => destinos[id])
  const associacoes = acoesEscolhidas.filter(destino => destino && destino !== 'novo')
  const podeImportar = jornada && selecionados.length && acoesEscolhidas.every(Boolean) &&
    new Set(associacoes.map(destino => destino.replace(/^importado:/, ''))).size === associacoes.length

  return (
    <details className="pl-jornadas-painel">
      <summary>Escolher jogos de competições oficiais</summary>
      <form onSubmit={evento => {
        evento.preventDefault()
        void executar('listar')
      }}>
        <div className="pl-jornadas-campos">
          <label>Competição{' '}
            <select className="pl-jornadas-input" value={competicao} disabled={ocupado}
              onChange={e => { setCompeticao(e.target.value); limparPrevia() }}>
              {competicoes.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
          <label>Ano de início da época oficial{' '}
            <input className="pl-jornadas-input" type="number" min="2000" max="2100" required
              value={ano} disabled={ocupado} onChange={e => { setAno(e.target.value); limparPrevia() }} />
          </label>
          <button type="submit" className="pl-jornadas-botao-secundario" disabled={ocupado}>
            Procurar jogos
          </button>
        </div>
      </form>
      <p>Mostra os jogos com hora confirmada nos próximos 45 dias. Podes importar jogos de competições diferentes para a mesma jornada.</p>
      {ocupado && <p role="status">A processar jogos…</p>}
      {erro && <p role="alert">{erro}</p>}
      {jogos?.length === 0 && <p role="status">Sem jogos com hora confirmada neste intervalo.</p>}
      {jogos?.length > 0 && (
        <fieldset disabled={ocupado}>
          <legend>Jogos com hora confirmada</legend>
          <div className="pl-jornadas-campos">
            <label>Jornada da Predict League{' '}
              <select className="pl-jornadas-input" value={jornada} onChange={e => { setJornada(e.target.value); setDestinos({}) }}>
                <option value="">{jornadas.length ? 'Escolhe uma jornada' : 'Cria uma jornada primeiro'}</option>
                {jornadas.map(item => <option key={item.id} value={item.id}>{item.nome || `Jornada ${item.numero}`}</option>)}
              </select>
            </label>
          </div>
          <ul>
            {jogos.map(jogo => {
              const selecionado = selecionados.includes(jogo.id)
              return (
                <li key={jogo.id}>
                  <label><input type="checkbox" checked={selecionado} disabled={!selecionado && selecionados.length >= 40}
                    onChange={e => setSelecionados(anteriores => e.target.checked
                      ? [...anteriores, jogo.id] : anteriores.filter(id => id !== jogo.id))} />
                  {' '}{jogo.casa} vs {jogo.fora} · {hora.format(new Date(jogo.hora))}</label>
                  {selecionado && jornada && <div>
                    <label>Ação para {jogo.casa} vs {jogo.fora}{' '}
                      <select className="pl-jornadas-input" value={destinos[jogo.id] || ''} onChange={e =>
                        setDestinos(anteriores => ({ ...anteriores, [jogo.id]: e.target.value }))}>
                        <option value="">Escolhe uma ação</option>
                        <option value="novo">Importar se ainda não existir</option>
                        {opcoes.map(local => <option key={local.id} value={local.id}>
                          Manter {local.home_team} vs {local.away_team} · {hora.format(new Date(local.kickoff))}
                        </option>)}
                        {opcoes.map(local => <option key={`importado:${local.id}`} value={`importado:${local.id}`}>
                          Manter o importado e juntar {local.home_team} vs {local.away_team} · {hora.format(new Date(local.kickoff))}
                        </option>)}
                      </select>
                    </label>
                  </div>}
                </li>
              )
            })}
          </ul>
          {associacoes.length > 0 && <p>Confirma qual dos cartões queres manter. Ao manter o importado, o jogo manual é removido depois de transferir os prognósticos. A junção é bloqueada se houver prognósticos da mesma pessoa nos dois cartões.</p>}
            <button type="button" className="pl-jornadas-botao" disabled={!podeImportar}
              onClick={() => executar('importar')}>
              Importar seleção ({selecionados.length})
            </button>
        </fieldset>
      )}
      {relatorio && (
        <section aria-label="Resultado da importação">
          <h4>Resultado da importação</h4>
          <ul>{relatorio.map(jogo => (
            <li key={jogo.id}><strong>{jogo.casa} vs {jogo.fora}</strong> · {resultados[jogo.acao]}</li>
          ))}</ul>
        </section>
      )}
    </details>
  )
}
