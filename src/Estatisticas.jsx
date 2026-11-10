
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const COMPETICAO_ID = '549b62f6-1f54-48db-b002-adb0e4754642'

const estilos = `
  .pl-estatisticas {
    color: #f8fafc;
    font-family: Arial, sans-serif;
    width: 100%;
    min-width: 0;
  }

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

function Estatisticas() {
  const [estatisticas, setEstatisticas] = useState(null)
  const [posicao, setPosicao] = useState(null)
  const [pontosLider, setPontosLider] = useState(null)
  const [taxaAcerto, setTaxaAcerto] = useState(null)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    async function carregarEstatisticas() {
      try {
        const {
          data: utilizador,
          error: erroAuth
        } = await supabase.auth.getUser()

        if (!ativo) return

        if (erroAuth || !utilizador?.user) {
          throw new Error(
            'Não foi possível identificar o participante.'
          )
        }

        const [resultadoLiga, resultadoTaxa] = await Promise.all([
          supabase.rpc('obter_classificacao', {
            p_competition_id: COMPETICAO_ID
          }),
          supabase.rpc('obter_taxa_acerto', {
            p_competition_id: COMPETICAO_ID
          })
        ])

        if (!ativo) return

        if (resultadoLiga.error) {
          throw resultadoLiga.error
        }

        const classificacao = resultadoLiga.data || []

        const meusDados = classificacao.find(
          jogador => jogador.user_id === utilizador.user.id
        )

        const indice = classificacao.findIndex(
          jogador => jogador.user_id === utilizador.user.id
        )

        setEstatisticas(meusDados || null)
        setPosicao(indice >= 0 ? indice + 1 : null)

        setPontosLider(
          classificacao.length > 0
            ? Math.max(
                ...classificacao.map(
                  jogador => Number(jogador.pontos) || 0
                )
              )
            : null
        )

        if (resultadoTaxa.error) {
          console.error(
            'Erro ao carregar taxa de acerto:',
            resultadoTaxa.error
          )
          setTaxaAcerto(null)
        } else {
          setTaxaAcerto(
            resultadoTaxa.data?.[0]?.taxa_acerto ?? 0
          )
        }
      } catch (e) {
        if (ativo) {
          setErro(e.message || 'Erro ao carregar estatísticas.')
        }
      } finally {
        if (ativo) setACarregar(false)
      }
    }

    carregarEstatisticas()

    return () => {
      ativo = false
    }
  }, [])

  const pontos = Number(estatisticas?.pontos || 0)
  const exatos = Number(estatisticas?.resultados_exatos || 0)
  const jogos = Number(estatisticas?.jogos_pontuados || 0)

  const valorPrecisao = jogos > 0
    ? (exatos / jogos) * 100
    : 0

  const precisao = valorPrecisao.toFixed(1) + '%'

  const diferencaLider =
    pontosLider !== null
      ? Math.max(0, pontosLider - pontos)
      : null

  const valorTaxa = taxaAcerto !== null
    ? Number(taxaAcerto)
    : null

  const limitarPercentagem = valor =>
    Math.min(100, Math.max(0, Number(valor) || 0))

  const cartoes = [
    {
      titulo: 'Resultados exatos',
      icone: '🎯',
      valor: exatos
    },
    {
      titulo: 'Jogos pontuados',
      icone: '⚽',
      valor: jogos
    },
    {
      titulo: 'Precisão',
      icone: '📊',
      valor: precisao
    },
    {
      titulo: 'Pontos para o líder',
      icone: '👑',
      valor: diferencaLider !== null ? diferencaLider : '—'
    },
    {
      titulo: 'Taxa de acerto',
      icone: '🎯',
      valor: valorTaxa !== null
        ? `${valorTaxa.toFixed(1)}%`
        : '—'
    }
  ]

  return (
    <div className="pl-estatisticas">
      <style>{estilos}</style>

      <h2 className="pl-estatisticas-titulo">
        📊 As minhas estatísticas
      </h2>

      <p className="pl-estatisticas-subtitulo">
        Acompanha o teu desempenho na Predict League
        e descobre como estás a evoluir na classificação.
      </p>

      {aCarregar && (
        <p style={{ color: '#94a3b8' }}>
          A carregar estatísticas...
        </p>
      )}

      {erro && (
        <div className="pl-estatisticas-erro">
          Erro: {erro}
        </div>
      )}

      {!aCarregar && !erro && !estatisticas && (
        <div className="pl-estatisticas-vazio">
          Ainda não existem estatísticas para esta época.
        </div>
      )}

      {!aCarregar && !erro && estatisticas && (
        <>
          <section className="pl-estatisticas-destaque">
            <h3>🏆 Resumo da época</h3>

            <div className="pl-estatisticas-destaque-grid">
              <div className="pl-estatisticas-destaque-item">
                <strong>
                  {posicao !== null ? `${posicao}.º` : '—'}
                </strong>
                <span>Posição na Liga</span>
              </div>

              <div className="pl-estatisticas-destaque-item">
                <strong>{pontos}</strong>
                <span>Pontos totais</span>
              </div>

              <div className="pl-estatisticas-destaque-item">
                <strong>
                  {diferencaLider !== null
                    ? diferencaLider
                    : '—'}
                </strong>
                <span>Pontos para o líder</span>
              </div>
            </div>
          </section>

          <h3 className="pl-estatisticas-seccao-titulo">
            ⚽ Desempenho individual
          </h3>

          <div className="pl-estatisticas-grid">
            {cartoes.map(cartao => (
              <div
                key={cartao.titulo}
                className="pl-estatisticas-cartao"
              >
                <div className="pl-estatisticas-icone">
                  {cartao.icone}
                </div>

                <div className="pl-estatisticas-cartao-titulo">
                  {cartao.titulo}
                </div>

                <div className="pl-estatisticas-cartao-valor">
                  {cartao.valor}
                </div>
              </div>
            ))}
          </div>

          <section className="pl-estatisticas-analise">
            <h3>📈 Análise de desempenho</h3>

            <div className="pl-estatisticas-barra-linha">
              <div className="pl-estatisticas-barra-topo">
                <span>🎯 Precisão de resultados exatos</span>
                <strong>{precisao}</strong>
              </div>

              <div className="pl-estatisticas-barra-fundo">
                <div
                  className="pl-estatisticas-barra-progresso"
                  style={{
                    width: `${limitarPercentagem(valorPrecisao)}%`
                  }}
                />
              </div>
            </div>

            <div className="pl-estatisticas-barra-linha">
              <div className="pl-estatisticas-barra-topo">
                <span>⚽ Taxa de acerto de tendências</span>
                <strong>
                  {valorTaxa !== null
                    ? `${valorTaxa.toFixed(1)}%`
                    : '—'}
                </strong>
              </div>

              <div className="pl-estatisticas-barra-fundo">
                <div
                  className="pl-estatisticas-barra-progresso"
                  style={{
                    width: `${
                      valorTaxa !== null
                        ? limitarPercentagem(valorTaxa)
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>

            <p className="pl-estatisticas-nota">
              A precisão corresponde à percentagem de
              resultados exatos nos jogos pontuados.
              A taxa de acerto corresponde à percentagem
              de prognósticos em que acertaste no vencedor
              ou no empate.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

export default Estatisticas
