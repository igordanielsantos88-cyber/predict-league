
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const estilos = `
  .pl-participantes {
    color: #f8fafc;
    font-family: Arial, sans-serif;
    width: 100%;
    min-width: 0;
  }

  .pl-participantes * {
    box-sizing: border-box;
  }

  .pl-participantes-titulo {
    color: #e8c76a;
    font-size: clamp(22px, 4vw, 28px);
    margin: 0 0 10px;
  }

  .pl-participantes-subtitulo {
    color: #94a3b8;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 24px;
  }

  .pl-participantes-resumo {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 25px;
  }

  .pl-participantes-resumo-card {
    background: linear-gradient(145deg, #1b2535, #131c2b);
    border: 1px solid #594821;
    border-radius: 15px;
    padding: 20px;
    text-align: center;
  }

  .pl-participantes-resumo-card strong {
    display: block;
    font-size: clamp(24px, 4vw, 32px);
    color: #f0d477;
    margin-bottom: 8px;
  }

  .pl-participantes-resumo-card span {
    color: #94a3b8;
    font-size: 13px;
  }

  .pl-participantes-barra {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
  }

  .pl-participantes-botao {
    background: linear-gradient(135deg, #f0d477, #c69c32);
    color: #211806;
    border: none;
    border-radius: 10px;
    padding: 12px 17px;
    font-weight: bold;
    cursor: pointer;
    transition: transform .2s, box-shadow .2s;
  }

  .pl-participantes-botao:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px #d4af3730;
  }

  .pl-participantes-botao:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .pl-participantes-seccao {
    margin-bottom: 32px;
  }

  .pl-participantes-seccao-titulo {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 19px;
    margin: 0 0 17px;
    color: #f8fafc;
  }

  .pl-participantes-contador {
    display: inline-block;
    padding: 4px 10px;
    background: #d4af3720;
    border: 1px solid #d4af3750;
    border-radius: 20px;
    color: #f0d477;
    font-size: 12px;
  }

  .pl-participantes-lista {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .pl-participantes-cartao {
    background: linear-gradient(145deg, #1b2535, #131c2b);
    border: 1px solid #334155;
    border-radius: 16px;
    padding: 20px;
    min-width: 0;
    transition: border-color .2s;
  }

  .pl-participantes-cartao:hover {
    border-color: #8f722e;
  }

  .pl-participantes-cartao.pendente {
    border-color: #8f722e;
    background: linear-gradient(145deg, #25271e, #151d2a);
  }

  .pl-participantes-cartao-topo {
    display: flex;
    align-items: center;
    gap: 13px;
    margin-bottom: 15px;
  }

  .pl-participantes-avatar {
    width: 48px;
    height: 48px;
    min-width: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: linear-gradient(135deg, #f0d477, #98741f);
    color: #211806;
    font-weight: bold;
    font-size: 20px;
    text-transform: uppercase;
  }

  .pl-participantes-identidade {
    min-width: 0;
  }

  .pl-participantes-nome {
    font-size: 16px;
    font-weight: bold;
    color: #f8fafc;
    margin-bottom: 5px;
    overflow-wrap: anywhere;
  }

  .pl-participantes-email {
    color: #94a3b8;
    font-size: 12px;
    overflow-wrap: anywhere;
    line-height: 1.5;
  }

  .pl-participantes-estado {
    display: inline-flex;
    align-items: center;
    padding: 6px 11px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: bold;
    margin-bottom: 15px;
  }

  .pl-participantes-estado.pendente {
    background: #d4af3718;
    border: 1px solid #d4af3750;
    color: #f0d477;
  }

  .pl-participantes-estado.aprovado {
    background: #22c55e15;
    border: 1px solid #22c55e40;
    color: #86efac;
  }

  .pl-participantes-vazio {
    padding: 25px;
    background: #111827;
    border: 1px dashed #594821;
    border-radius: 14px;
    color: #94a3b8;
    text-align: center;
    font-size: 14px;
  }

  .pl-participantes-erro {
    padding: 15px;
    border: 1px solid #ef444460;
    border-radius: 10px;
    color: #fca5a5;
    margin-bottom: 18px;
    background: #ef444410;
  }

  @media (max-width: 650px) {
    .pl-participantes-lista {
      grid-template-columns: 1fr;
    }

    .pl-participantes-resumo {
      gap: 8px;
    }

    .pl-participantes-resumo-card {
      padding: 15px 8px;
    }

    .pl-participantes-resumo-card span {
      font-size: 11px;
    }

    .pl-participantes-cartao {
      padding: 16px;
    }
  }
`

function Participantes() {
  const [participantes, setParticipantes] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [aAprovar, setAAprovar] = useState(null)
  const [erro, setErro] = useState('')

  async function carregarParticipantes() {
    setACarregar(true)
    setErro('')

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, email, display_name, role, approval_status, created_at'
        )
        .eq('role', 'participant')
        .order('created_at', { ascending: false })

      if (error) throw error

      setParticipantes(data || [])
    } catch (e) {
      setErro('Erro ao carregar participantes: ' + e.message)
    } finally {
      setACarregar(false)
    }
  }

  useEffect(() => {
    carregarParticipantes()
  }, [])

  async function aprovarParticipante(id) {
    if (!window.confirm('Queres aprovar este participante?')) {
      return
    }

    setAAprovar(id)

    try {
      const { error } = await supabase.rpc(
        'aprovar_participante',
        { p_user_id: id }
      )

      if (error) throw error

      alert('Participante aprovado e inscrito na Predict League! 🏆')

      await carregarParticipantes()
    } catch (e) {
      alert('Erro ao aprovar: ' + e.message)
    } finally {
      setAAprovar(null)
    }
  }

  const pendentes = participantes.filter(
    p => p.approval_status === 'pending'
  )

  const aprovados = participantes.filter(
    p => p.approval_status === 'approved'
  )

  function cartaoParticipante(p, pendente) {
    const nome = p.display_name || 'Sem nome'
    const inicial = nome.charAt(0)

    return (
      <article
        key={p.id}
        className={
          `pl-participantes-cartao ${pendente ? 'pendente' : ''}`
        }
      >
        <div className="pl-participantes-cartao-topo">
          <div className="pl-participantes-avatar">
            {inicial}
          </div>

          <div className="pl-participantes-identidade">
            <div className="pl-participantes-nome">
              {nome}
            </div>

            <div className="pl-participantes-email">
              {p.email}
            </div>
          </div>
        </div>

        <div
          className={
            `pl-participantes-estado ${
              pendente ? 'pendente' : 'aprovado'
            }`
          }
        >
          {pendente
            ? '⏳ Aguarda aprovação'
            : '✓ Participante aprovado'}
        </div>

        {pendente && (
          <div>
            <button
              type="button"
              className="pl-participantes-botao"
              disabled={aAprovar !== null}
              onClick={() => aprovarParticipante(p.id)}
            >
              {aAprovar === p.id
                ? 'A aprovar...'
                : '✓ Aprovar participante'}
            </button>
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="pl-participantes">
      <style>{estilos}</style>

      <h2 className="pl-participantes-titulo">
        👥 Gerir Participantes
      </h2>

      <p className="pl-participantes-subtitulo">
        Consulta os jogadores inscritos na Predict League
        e aprova os novos pedidos de participação.
      </p>

      {!aCarregar && !erro && (
        <div className="pl-participantes-resumo">
          <div className="pl-participantes-resumo-card">
            <strong>{participantes.length}</strong>
            <span>Total de participantes</span>
          </div>

          <div className="pl-participantes-resumo-card">
            <strong>{pendentes.length}</strong>
            <span>Pedidos pendentes</span>
          </div>

          <div className="pl-participantes-resumo-card">
            <strong>{aprovados.length}</strong>
            <span>Aprovados</span>
          </div>
        </div>
      )}

      <div className="pl-participantes-barra">
        <button
          type="button"
          className="pl-participantes-botao"
          onClick={carregarParticipantes}
          disabled={aCarregar || aAprovar !== null}
        >
          {aCarregar
            ? 'A atualizar...'
            : '🔄 Atualizar lista'}
        </button>
      </div>

      {erro && (
        <div className="pl-participantes-erro">
          {erro}
        </div>
      )}

      {aCarregar ? (
        <p style={{ color: '#94a3b8' }}>
          A carregar participantes...
        </p>
      ) : !erro && (
        <>
          <section className="pl-participantes-seccao">
            <h3 className="pl-participantes-seccao-titulo">
              ⏳ Pedidos pendentes
              <span className="pl-participantes-contador">
                {pendentes.length}
              </span>
            </h3>

            {pendentes.length === 0 ? (
              <div className="pl-participantes-vazio">
                Não existem pedidos pendentes.
              </div>
            ) : (
              <div className="pl-participantes-lista">
                {pendentes.map(p => cartaoParticipante(p, true))}
              </div>
            )}
          </section>

          <section className="pl-participantes-seccao">
            <h3 className="pl-participantes-seccao-titulo">
              ✅ Participantes aprovados
              <span className="pl-participantes-contador">
                {aprovados.length}
              </span>
            </h3>

            {aprovados.length === 0 ? (
              <div className="pl-participantes-vazio">
                Ainda não existem participantes aprovados.
              </div>
            ) : (
              <div className="pl-participantes-lista">
                {aprovados.map(p => cartaoParticipante(p, false))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Participantes
