
import { useEffect, useState } from 'react'
import { supabase } from './supabase'


const estilos = `
  .pl-liga {
    color: #f8fafc;
    font-family: Arial, sans-serif;
    width: 100%;
    min-width: 0;
  }

  .pl-liga * {
    box-sizing: border-box;
  }

  .pl-liga-titulo {
    color: #e8c76a;
    font-size: clamp(22px, 4vw, 28px);
    margin: 0 0 8px;
  }

  .pl-liga-subtitulo {
    color: #94a3b8;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 24px;
  }

  .pl-liga-filtros {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 24px;
  }

  .pl-liga-filtro {
    padding: 12px 20px;
    background: #1b2535;
    color: #cbd5e1;
    border: 1px solid #3d3b30;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    transition: border-color .2s;
  }

  .pl-liga-filtro:hover {
    border-color: #d4af37;
  }

  .pl-liga-filtro.ativo {
    background: linear-gradient(135deg, #f0d477, #c69c32);
    border-color: #d4af37;
    color: #211806;
  }

  .pl-liga-filtro:focus-visible,
  .pl-liga-select:focus-visible {
    outline: 2px solid #f0d477;
    outline-offset: 3px;
  }

  .pl-liga-seletor {
    margin-bottom: 24px;
  }

  .pl-liga-label {
    display: block;
    color: #e8c76a;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .pl-liga-select {
    width: 100%;
    max-width: 350px;
    padding: 12px;
    background: #172235;
    color: #f8fafc;
    border: 1px solid #8f722e;
    border-radius: 10px;
    font-size: 15px;
  }

  .pl-liga-resumo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin: 20px 0;
  }

  .pl-liga-contagem {
    color: #94a3b8;
    font-size: 14px;
  }

  .pl-liga-meu-cartao {
    background: linear-gradient(120deg, #1b2535, #302718);
    border: 1px solid #8f722e;
    border-radius: 16px;
    padding: 22px;
    margin-bottom: 25px;
  }

  .pl-liga-meu-titulo {
    color: #e8c76a;
    margin: 0 0 18px;
    font-size: 18px;
  }

  .pl-liga-meus-numeros {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .pl-liga-numero {
    background: #0d1523;
    border: 1px solid #594821;
    border-radius: 12px;
    padding: 15px 10px;
    text-align: center;
  }

  .pl-liga-numero strong {
    display: block;
    color: #f0d477;
    font-size: clamp(20px, 3vw, 27px);
    margin-bottom: 8px;
  }

  .pl-liga-numero span {
    color: #94a3b8;
    font-size: 12px;
  }

  .pl-liga-tabela-container {
    overflow-x: auto;
    border: 1px solid #3d3b30;
    border-radius: 15px;
    background: #111827;
  }

  .pl-liga-tabela {
    width: 100%;
    border-collapse: collapse;
    min-width: 560px;
  }

  .pl-liga-tabela th {
    background: #1b2535;
    color: #e8c76a;
    padding: 17px 13px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .5px;
    text-align: center;
    white-space: nowrap;
  }

  .pl-liga-tabela th:nth-child(2) {
    text-align: left;
  }

  .pl-liga-tabela td {
    padding: 16px 13px;
    border-top: 1px solid #29384d;
    text-align: center;
    font-size: 14px;
  }

  .pl-liga-tabela td:nth-child(2) {
    text-align: left;
    font-weight: bold;
    overflow-wrap: anywhere;
  }

  .pl-liga-tabela tbody tr:hover {
    background: #ffffff09;
  }

  .pl-liga-primeiro {
    background: #d4af3715;
  }

  .pl-liga-segundo {
    background: #cbd5e10c;
  }

  .pl-liga-terceiro {
    background: #cd7f3210;
  }

  .pl-liga-eu {
    outline: 1px solid #d4af37;
    outline-offset: -1px;
    background: #d4af3720;
  }

  .pl-liga-pontos {
    color: #f0d477;
    font-size: 17px;
    font-weight: bold;
  }

  .pl-liga-medalha {
    font-size: 22px;
  }

  .pl-liga-eu-etiqueta {
    display: inline-block;
    margin-left: 8px;
    padding: 3px 7px;
    background: #d4af3720;
    border: 1px solid #d4af3750;
    border-radius: 6px;
    color: #e8c76a;
    font-size: 10px;
    white-space: nowrap;
  }

  .pl-liga-vazio {
    padding: 24px;
    color: #94a3b8;
    text-align: center;
  }

  @media (max-width: 600px) {
    .pl-liga-meu-cartao {
      padding: 15px;
    }

    .pl-liga-meus-numeros {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pl-liga-tabela {
      min-width: 510px;
    }

    .pl-liga-tabela th,
    .pl-liga-tabela td {
      padding: 13px 10px;
    }
  }
`

function calcularPrecisao(jogador) {
  const jogos = Number(jogador.jogos_pontuados) || 0
  const exatos = Number(jogador.resultados_exatos) || 0

  if (jogos <= 0) return '0%'

  return ((exatos / jogos) * 100).toFixed(1) + '%'
}

function calcularMovimentos(anterior, atual) {
  // As funções SQL não desempataram nomes iguais com pontos/exatos iguais.
  // Nesse caso omitimos a seta, em vez de inventar um movimento.
  const chave = jogador => JSON.stringify([
    Number(jogador.pontos), Number(jogador.resultados_exatos), jogador.jogador,
  ])
  const contar = lista => {
    const contagens = new Map()
    lista.forEach(jogador => {
      const valor = chave(jogador)
      contagens.set(valor, (contagens.get(valor) || 0) + 1)
    })
    return contagens
  }
  const contagemAnterior = contar(anterior)
  const contagemAtual = contar(atual)
  const posicoes = new Map(anterior.map((jogador, indice) => [
    jogador.user_id, { jogador, posicao: indice + 1 },
  ]))
  const movimentos = new Map()
  atual.forEach((jogador, indice) => {
    const antes = posicoes.get(jogador.user_id)
    if (
      antes && contagemAnterior.get(chave(antes.jogador)) === 1 &&
      contagemAtual.get(chave(jogador)) === 1
    ) movimentos.set(jogador.user_id, antes.posicao - (indice + 1))
  })
  return movimentos
}

function Liga({ competicaoId }) {
  const [tipoClassificacao, setTipoClassificacao] = useState('geral')
  const [selecao, setSelecao] = useState({ competicaoId: null, id: '' })
  const [recarregar, setRecarregar] = useState(0)
  const [estado, setEstado] = useState(null)
  const [ligacao, setLigacao] = useState({ competicaoId: null, estado: 'a-ligar' })
  const jornadaPedida = selecao.competicaoId === competicaoId ? selecao.id : ''

  useEffect(() => {
    if (!competicaoId) return
    let ativo = true
    let versao = 0
    let temporizador = null
    let controller = null
    const chaveCanal = `liga-resultados-${competicaoId}-${Math.random().toString(36).slice(2)}`

    const executar = async consulta => {
      const { data, error } = await consulta
      if (error) throw error
      return data
    }

    async function carregar() {
      const minhaVersao = ++versao
      controller?.abort()
      const pedido = new AbortController()
      controller = pedido
      const vigente = () => ativo && minhaVersao === versao
      const consultar = consulta => executar(consulta.abortSignal(pedido.signal))
      // Adia a atualização inicial até depois da execução síncrona do efeito.
      await Promise.resolve()
      if (!vigente()) return
      setEstado(anterior => ({
        competicaoId, jornadaPedida, aCarregar: true, erro: '',
        dados: anterior?.competicaoId === competicaoId && anterior?.jornadaPedida === jornadaPedida
          ? anterior.dados : null,
      }))
      try {
        const dados = await consultar(supabase.rpc('obter_painel_classificacao', {
          p_competition_id: competicaoId,
          p_jornada_id: jornadaPedida || null,
        }))
        if (!vigente()) return
        if (
          dados?.versao !== 1 || dados.competicaoId !== competicaoId ||
          !Array.isArray(dados.geral) || !Array.isArray(dados.porJornada) ||
          !Array.isArray(dados.acumulada) || !Array.isArray(dados.acumuladaAnterior) ||
          !Array.isArray(dados.jornadas) || !Array.isArray(dados.jogos)
        ) throw new Error('A resposta da classificação é inválida. Tenta atualizar novamente.')
        // A função STABLE devolve todas as listas na mesma leitura da base de dados.
        setEstado({ competicaoId, jornadaPedida, aCarregar: false, erro: '', dados })

      } catch (erro) {
        if (vigente()) setEstado({
          competicaoId, jornadaPedida, aCarregar: false,
          erro: erro.message || 'Não foi possível atualizar a classificação.', dados: null,
        })
      }
    }

    function agendarAtualizacao() {
      if (!ativo) return
      ++versao
      controller?.abort()
      clearTimeout(temporizador)
      // Retira imediatamente posições/setas que possam ter ficado desatualizadas.
      setEstado(anterior => anterior ? { ...anterior, aCarregar: true, erro: '' } : anterior)
      temporizador = setTimeout(carregar, 200)
    }

    const canal = supabase.channel(chaveCanal)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'matches',
        filter: `competition_id=eq.${competicaoId}`,
      }, agendarAtualizacao)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'matches',
        filter: `competition_id=eq.${competicaoId}`,
      }, agendarAtualizacao)
      .subscribe(status => {
        if (!ativo) return
        setLigacao({ competicaoId, estado: status })
        if (status === 'SUBSCRIBED') agendarAtualizacao()
      })

    void carregar()
    // Recupera eventos perdidos e eliminações, mesmo sem uma ligação Realtime ativa.
    // Não dependemos de DELETE filtrado no Realtime.
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') agendarAtualizacao()
    }, 60000)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') agendarAtualizacao()
    }
    window.addEventListener('online', aoVoltar)
    window.addEventListener('focus', aoVoltar)
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      ativo = false
      ++versao
      controller?.abort()
      clearTimeout(temporizador)
      clearInterval(intervalo)
      window.removeEventListener('online', aoVoltar)
      window.removeEventListener('focus', aoVoltar)
      document.removeEventListener('visibilitychange', aoVoltar)
      void supabase.removeChannel(canal)
    }
  }, [competicaoId, jornadaPedida, recarregar])

  const estadoCorreto = estado?.competicaoId === competicaoId && estado?.jornadaPedida === jornadaPedida
  const dados = estadoCorreto ? estado.dados : null
  const aCarregarAtual = Boolean(competicaoId) && (!estadoCorreto || estado.aCarregar)
  const erroAtual = !competicaoId ? 'Não foi possível identificar a competição ativa.'
    : estadoCorreto ? estado.erro : ''
  const jornadas = dados?.jornadas || []
  const jornadaSelecionada = dados?.jornadaSelecionada || ''
  const utilizadorAtual = dados?.utilizadorAtual || null
  const classificacaoVisivel = tipoClassificacao === 'geral' ? dados?.geral || []
    : tipoClassificacao === 'concluidas' ? dados?.acumulada || [] : dados?.porJornada || []
  const movimentosParaMostrar = !aCarregarAtual && !erroAtual && dados?.anterior
    ? calcularMovimentos(dados.acumuladaAnterior, dados.acumulada) : new Map()
  const minhaPosicaoVisivel = classificacaoVisivel.findIndex(jogador => jogador.user_id === utilizadorAtual)
  const meusDadosVisiveis = classificacaoVisivel[minhaPosicaoVisivel] || null
  const lideresJornada = dados?.porJornada || []
  const jogosDaJornada = dados?.jogos.filter(jogo => jogo.jornada_id === jornadaSelecionada) || []
  const jornadaConcluidaParaMostrar = jogosDaJornada.length > 0 &&
    jogosDaJornada.every(jogo => jogo.status === 'finished' && jogo.resultado_valido)
  const estadoLigacao = ligacao.competicaoId === competicaoId ? ligacao.estado : 'a-ligar'

  return (

    <div className="pl-liga">
      <style>{estilos}</style>

      <h2 className="pl-liga-titulo">
  🏆 Classificação Predict League
      </h2>

      <p className="pl-liga-subtitulo">
        Acompanha a luta pelo primeiro lugar e consulta
        a classificação geral ou de cada jornada.
      </p>

      <div className="pl-liga-filtros">
        <button
          type="button"
          className={
            `pl-liga-filtro ${tipoClassificacao === 'geral' ? 'ativo' : ''}`
          }
          onClick={() => setTipoClassificacao('geral')}
        >
          🏆 Geral
        </button>

        <button
          type="button"
          className={`pl-liga-filtro ${tipoClassificacao === 'concluidas' ? 'ativo' : ''}`}
          onClick={() => setTipoClassificacao('concluidas')}
        >
          ↕ Após jornadas concluídas
        </button>

        <button
          type="button"
          className={
            `pl-liga-filtro ${tipoClassificacao === 'jornada' ? 'ativo' : ''}`
          }
          onClick={() => setTipoClassificacao('jornada')}
        >
          📅 Por jornada
        </button>
      </div>

      <div className="pl-liga-resumo">
        <span className="pl-liga-contagem" role="status">
          {estadoLigacao === 'SUBSCRIBED'
            ? 'Ligação automática ativa. Verificação adicional a cada minuto.'
            : 'Ligação automática indisponível ou a ligar. Verificação a cada minuto.'}
        </span>
        <button type="button" className="pl-liga-filtro"
          disabled={aCarregarAtual || !competicaoId}
          onClick={() => setRecarregar(valor => valor + 1)}>
          Atualizar
        </button>
      </div>

      {tipoClassificacao === 'geral' && (
        <p className="pl-liga-subtitulo">
          Inclui todos os pontos já atribuídos, mesmo durante uma jornada.
        </p>
      )}

      {tipoClassificacao === 'concluidas' && !aCarregarAtual && !erroAtual && (
        <p className="pl-liga-subtitulo">
          {dados?.ultima
            ? `Acumulado até à Jornada ${dados.ultima.numero}. `
            : 'Ainda não há jornadas consecutivas concluídas desde a Jornada 1. '}
          {dados?.anterior
            ? `Movimentos face ao acumulado até à Jornada ${dados.anterior.numero}. `
            : dados?.ultima ? 'As setas aparecem após duas jornadas consecutivas concluídas. ' : ''}
          Uma jornada incompleta ou em falta impede o avanço desta vista.
          {' '}Sem seta: sem comparação disponível ou desempate por definir.
        </p>
      )}

      {tipoClassificacao === 'jornada' && (
        <div className="pl-liga-seletor">
          <label
            htmlFor="selecionar-jornada"
            className="pl-liga-label"
          >
            📅 Escolher jornada
          </label>

          <select
            id="selecionar-jornada"
            className="pl-liga-select"
            value={jornadaSelecionada}
            onChange={e => setSelecao({ competicaoId, id: e.target.value })}
            disabled={aCarregarAtual}
          >
            {jornadas.length === 0 && (
              <option value="">
                Sem jornadas disponíveis
              </option>
            )}

            {jornadas.map(jornada => (
              <option key={jornada.id} value={jornada.id}>
                {jornada.nome || `Jornada ${jornada.numero}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {aCarregarAtual && (
        <p style={{ color: '#94a3b8' }}>
          A carregar classificação...
        </p>
      )}

      {erroAtual && (
        <p style={{ color: '#f87171' }}>
          Erro: {erroAtual}
        </p>
      )}

      {!aCarregarAtual &&
        !erroAtual &&
        (tipoClassificacao !== 'jornada' || jornadaSelecionada) && (
          <>
            <div className="pl-liga-resumo">
              <span className="pl-liga-contagem">
                👥 Jogadores inscritos: {classificacaoVisivel.length}
              </span>
            </div>

            {meusDadosVisiveis && (
              <section className="pl-liga-meu-cartao">
                <h3 className="pl-liga-meu-titulo">
                  👤 A minha classificação
                </h3>

                <div className="pl-liga-meus-numeros">
                  <div className="pl-liga-numero">
                    <strong>{minhaPosicaoVisivel + 1}.º</strong>
                    <span>Posição</span>
                  </div>

                  <div className="pl-liga-numero">
                    <strong>{meusDadosVisiveis.pontos}</strong>
                    <span>Pontos</span>
                  </div>

                  <div className="pl-liga-numero">
                    <strong>{meusDadosVisiveis.resultados_exatos}</strong>
                    <span>Resultados exatos</span>
                  </div>

                  <div className="pl-liga-numero">
                    <strong>{meusDadosVisiveis.jogos_pontuados}</strong>
                    <span>Jogos pontuados</span>
                  </div>
                </div>
              </section>
            )}
{tipoClassificacao === 'jornada' &&
  lideresJornada.length > 0 &&
  Number(lideresJornada[0].pontos) > 0 && (
    <div className="pl-liga-meu-cartao">
      <h3 className="pl-liga-meu-titulo">
        {jornadaConcluidaParaMostrar
  ? '🏆 Campeão da jornada'
  : '🥇 Líderes provisórios'}
      </h3>

      {lideresJornada
        .filter(
          jogador =>
            Number(jogador.pontos) ===
            Number(lideresJornada[0].pontos)
        )
        .map(jogador => (
          <div
            key={jogador.user_id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 0',
              borderBottom: '1px solid #594821',
            }}
          >
            <strong style={{ fontSize: '18px' }}>
              🥇 {jogador.jogador}
            </strong>

            <strong
              style={{
                color: '#f0d477',
                fontSize: '22px',
              }}
            >
              {jogador.pontos} pts
            </strong>
          </div>
        ))}
    </div>
  )}
            {classificacaoVisivel.length === 0 ? (
              <div className="pl-liga-vazio">
                {tipoClassificacao === 'concluidas' && !dados?.ultima
                  ? 'A classificação ficará disponível quando a Jornada 1 estiver concluída.'
                  : 'Ainda não existem jogadores nesta classificação.'}
              </div>
            ) : (
              <div className="pl-liga-tabela-container">
                <table className="pl-liga-tabela">
                  <thead>
                    <tr>
                      <th>Pos.</th>
                      <th>Jogador</th>
                      <th>Jogos</th>
                      <th>Pontos</th>
                      <th>Exatos</th>
                      <th>Precisão</th>
                    </tr>
                  </thead>

                  <tbody>
                    {classificacaoVisivel.map((jogador, indice) => {
                      const souEu =
                        jogador.user_id === utilizadorAtual

                      const classePosicao =
                        indice === 0
                          ? 'pl-liga-primeiro'
                          : indice === 1
                            ? 'pl-liga-segundo'
                            : indice === 2
                              ? 'pl-liga-terceiro'
                              : ''

                      return (
                        <tr
                          key={jogador.user_id}
                          className={
                            `${classePosicao} ${souEu ? 'pl-liga-eu' : ''}`
                          }
                        >
                         <td>
  <span className="pl-liga-medalha">
    {indice === 0
      ? '🥇'
      : indice === 1
        ? '🥈'
        : indice === 2
          ? '🥉'
          : `${indice + 1}.º`}
  </span>

{  tipoClassificacao === 'concluidas' &&
 movimentosParaMostrar.has(jogador.user_id) && (
  <span
    title={movimentosParaMostrar.get(jogador.user_id) > 0
      ? `Subiu ${movimentosParaMostrar.get(jogador.user_id)} posições`
      : movimentosParaMostrar.get(jogador.user_id) < 0
        ? `Desceu ${Math.abs(movimentosParaMostrar.get(jogador.user_id))} posições`
        : 'Manteve a posição'}
    style={{
      marginLeft: '8px',
      fontWeight: 'bold',
      color:
        movimentosParaMostrar.get(jogador.user_id) > 0
          ? '#22c55e'
          : movimentosParaMostrar.get(jogador.user_id) < 0
            ? '#ef4444'
            : '#94a3b8',
    }}
  >
    {movimentosParaMostrar.get(jogador.user_id) > 0
      ? `↑${movimentosParaMostrar.get(jogador.user_id)}`
      : movimentosParaMostrar.get(jogador.user_id) < 0
        ? `↓${Math.abs(movimentosParaMostrar.get(jogador.user_id))}`
        : '–'}
  </span>
)}

</td>

                          <td>
                            {jogador.jogador}
                            {souEu && (
                              <span className="pl-liga-eu-etiqueta">
                                TU
                              </span>
                            )}
                          </td>

                          <td>{jogador.jogos_pontuados}</td>

                          <td className="pl-liga-pontos">
                            {jogador.pontos}
                          </td>

                          <td>{jogador.resultados_exatos}</td>

                          <td>{calcularPrecisao(jogador)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
    </div>
  )
}

export default Liga
