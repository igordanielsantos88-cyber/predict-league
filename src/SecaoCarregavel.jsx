import { Component, Suspense } from 'react'

export default class SecaoCarregavel extends Component {
  state = { erro: false }

  static getDerivedStateFromError() {
    return { erro: true }
  }

  render() {
    if (this.state.erro) return (
      <div>
        <p role="alert">Não foi possível abrir esta secção.</p>
        <button type="button" className="pl-back" onClick={() => window.location.reload()}>
          Recarregar a aplicação
        </button>
      </div>
    )

    return (
      <Suspense fallback={<p role="status">A carregar secção…</p>}>
        {this.props.children}
      </Suspense>
    )
  }
}
