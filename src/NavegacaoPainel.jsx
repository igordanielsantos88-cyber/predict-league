import './painel.css'
import IconePainel from './IconePainel'

const itens = [
  ['inicio', 'Início'],
  ['prognosticos', 'Jogos'],
  ['liga', 'Classificação'],
  ['notificacoes', 'Avisos'],
  ['mais', 'Mais'],
]

export function BarraPainel({ pagina, abrir, naoLidas }) {
  const selecionado = ['proximo-jogo', 'prognosticos-pendentes'].includes(pagina) ? 'prognosticos'
    : itens.some(([id]) => id === pagina) ? pagina : 'mais'

  return (
    <nav className="pl-barra" aria-label="Navegação principal">
      {itens.map(([id, nome]) => (
        <button type="button" key={id} aria-current={id === selecionado ? 'page' : undefined}
          aria-label={id === 'notificacoes' && naoLidas > 0 ? `Avisos (${naoLidas} por ler)` : nome}
          onClick={() => abrir(id)}>
          <span className="pl-barra-icone" aria-hidden="true"><IconePainel nome={id} />
            {id === 'notificacoes' && naoLidas > 0 && <small>{naoLidas > 99 ? '99+' : naoLidas}</small>}
          </span>
          <span>{nome}</span>
        </button>
      ))}
    </nav>
  )
}

export function SecoesPainel({ secoes, abrir, estaDisponivel, outras = false }) {
  const lista = outras ? secoes.filter(secao => !itens.some(([id]) => id === secao.id)) : secoes
  return (
    <section className={outras ? 'pl-outras-secoes' : 'pl-explorar'} aria-label={outras ? 'Mais secções' : 'Explorar a competição'}>
      <div className="pl-section-heading"><h2 className="pl-section-title">{outras ? 'Mais' : 'Explorar a competição'}</h2></div>
      <div className="pl-grid">
        {lista.map(secao => (
          <button type="button" key={secao.id} className="pl-card" onClick={() => abrir(secao.id)}
            disabled={!estaDisponivel(secao.id)}>
            <span className="pl-card-icon" aria-hidden="true"><IconePainel nome={secao.id} tamanho={24} /></span>
            <h3>{secao.nome}</h3>
            <p>{secao.descricao}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
