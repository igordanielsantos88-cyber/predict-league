import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const estados = [
  ['pending', 'Na fila'],
  ['sending', 'Em envio'],
  ['accepted', 'Aceites pelo fornecedor'],
  ['failed', 'Falhados'],
  ['uncertain', 'Envio incerto'],
  ['cancelled', 'Cancelados'],
  ['expired', 'Expirados'],
]

const motivos = {
  endpoint_unsupported: 'Fornecedor não suportado',
  prepare_failed: 'Erro ao preparar o aviso',
  transport_uncertain: 'Resposta do fornecedor incerta',
  provider_rejected: 'Fornecedor rejeitou o aviso',
  rate_limited: 'Limite do fornecedor atingido',
  subscription_expired: 'Subscrição expirada',
  worker_interrupted: 'Processamento interrompido',
  no_longer_eligible: 'Aviso deixou de estar elegível',
}

const dataHora = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' })

const estilos = `
.pl-push-diagnostico .pl-push-estados { display:grid; grid-template-columns:repeat(auto-fit,minmax(135px,1fr)); gap:10px; }
.pl-push-diagnostico .pl-push-estados div { min-width:0; padding:12px; border:1px solid #3d3b30; border-radius:10px; background:#111827; }
.pl-push-diagnostico dt,.pl-push-diagnostico .pl-push-nota { color:#a7b5c9; }
.pl-push-diagnostico dd { margin:6px 0 0; color:#f0d477; font-size:24px; font-weight:bold; }
.pl-push-diagnostico li { margin-bottom:6px; overflow-wrap:anywhere; }
`

export default function DiagnosticoPush() {
  const [pedido, setPedido] = useState(0)
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      const { data, error } = await supabase.rpc('obter_diagnostico_push').abortSignal(controller.signal)
      if (controller.signal.aborted) return
      if (error || !data?.contagens || !Array.isArray(data.motivos)) {
        setEstado({ pedido, erro: 'Não foi possível carregar o diagnóstico.' })
      } else {
        setEstado({ pedido, dados: data })
      }
    }
    void carregar()
    return () => controller.abort()
  }, [pedido])

  const aCarregar = estado?.pedido !== pedido
  const dados = aCarregar ? null : estado.dados
  return (
    <section className="pl-push-diagnostico" aria-label="Estado dos envios push" aria-busy={aCarregar}>
      <style>{estilos}</style>
      <button type="button" className="pl-back" disabled={aCarregar}
        onClick={() => setPedido(atual => atual + 1)}>Atualizar diagnóstico</button>
      {aCarregar && <p role="status">A carregar diagnóstico…</p>}
      {!aCarregar && estado.erro && <p role="alert">{estado.erro}</p>}
      {dados && (
        <>
          <p>Envio automático {dados.envioAtivo
            ? (dados.soAdministradores ? 'ativo só para administradores.' : 'ativo para participantes elegíveis.')
            : 'desligado.'}</p>
          <p className="pl-push-nota">Últimos 7 dias · Atualizado a {dataHora.format(new Date(dados.atualizadoEm))}</p>
          <dl className="pl-push-estados">
            {estados.map(([id, nome]) => (
              <div key={id}><dt>{nome}</dt><dd>{dados.contagens[id]}</dd></div>
            ))}
          </dl>
          <p className="pl-push-nota">Uma aceitação confirma a receção pelo fornecedor. A entrega no telemóvel depende do dispositivo.</p>
          {dados.ultimoAceiteEm && <p>Última aceitação a {dataHora.format(new Date(dados.ultimoAceiteEm))}.</p>}
          <h3>Motivos de falhas e envios incertos</h3>
          {dados.motivos.length ? <ul>
            {dados.motivos.map(item => (
              <li key={`${item.codigo}:${item.http}`}>
                {motivos[item.codigo] || 'Outro motivo'}
                {item.http && ` (HTTP ${item.http})`}
                {' · '}{item.total} {item.total === 1 ? 'envio' : 'envios'}
              </li>
            ))}
          </ul> : <p>Sem falhas ou envios incertos neste período.</p>}
        </>
      )}
    </section>
  )
}
