import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { suportePush, prepararPush, consultarPush, ativarPush, desativarPush, testarPush, ouvirPush } from './push'

export default function PushNotificacoes() {
  const [estado, setEstado] = useState({ fase: 'carregar', config: null, id: null, erro: '', nota: '' })
  const [ocupado, setOcupado] = useState(false)
  const vivo = useRef(false)
  const sequencia = useRef(0)
  const bloqueio = useRef(false)
  const atual = useRef(estado)
  atual.current = estado
  const recarregar = useRef(null)

  useEffect(() => {
    vivo.current = true
    async function carregar() {
      const seq = ++sequencia.current
      setEstado({ fase: 'carregar', config: null, id: null, erro: '', nota: '' })
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!vivo.current || seq !== sequencia.current) return
        if (error || !data?.user) { setEstado({ fase: 'oculto' }); return }
        const { data: perfil, error: erroPerfil } = await supabase.from('profiles')
          .select('role,approval_status').eq('id', data.user.id).maybeSingle()
        if (!vivo.current || seq !== sequencia.current) return
        if (erroPerfil) throw new Error('Não foi possível verificar o acesso às notificações push.')
        if (perfil?.approval_status !== 'approved') {
          setEstado({ fase: 'oculto' }); return
        }
        const falta = suportePush()
        if (falta) { setEstado({ fase: 'indisponivel', nota: falta }); return }
        const config = await prepararPush(data.user.id)
        const id = await consultarPush(config)
        if (vivo.current && seq === sequencia.current) {
          setEstado({ fase: 'pronto', config, id, erro: '', nota: '' })
        }
      } catch (error) {
        if (vivo.current && seq === sequencia.current) setEstado({ fase: 'erro', config: null, id: null, erro: error.message })
      }
    }
    async function verificar() {
      if (bloqueio.current || document.visibilityState === 'hidden') return
      const anterior = atual.current
      if (!anterior.config) return
      const seq = ++sequencia.current
      try {
        const id = await consultarPush(anterior.config)
        if (vivo.current && seq === sequencia.current) setEstado(e => ({ ...e, id }))
      } catch {
        if (vivo.current && seq === sequencia.current) setEstado(e => ({ ...e, id: null, erro: 'Não foi possível confirmar o dispositivo. Volta a verificar.' }))
      }
    }
    recarregar.current = carregar
    carregar()
    const removerListener = ouvirPush(verificar)
    window.addEventListener('focus', verificar)
    document.addEventListener('visibilitychange', verificar)
    let utilizador = null
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id ?? null
      if (id === utilizador && event !== 'SIGNED_OUT') return
      utilizador = id
      ++sequencia.current
      setEstado({ fase: 'carregar', config: null, id: null, erro: '', nota: '' })
      queueMicrotask(() => { if (vivo.current) carregar() })
    })
    return () => {
      vivo.current = false
      ++sequencia.current
      recarregar.current = null
      removerListener()
      listener?.subscription?.unsubscribe()
      window.removeEventListener('focus', verificar)
      document.removeEventListener('visibilitychange', verificar)
    }
  }, [])

  function executar(acao) {
    if (bloqueio.current || !estado.config) return
    bloqueio.current = true
    setOcupado(true)
    setEstado(e => ({ ...e, erro: '', nota: '' }))
    const seq = ++sequencia.current
    let tarefa
    // ativarPush pede a permissão neste clique, antes de qualquer await.
    try {
      tarefa = acao === 'ativar' ? ativarPush(estado.config)
        : acao === 'desativar' ? desativarPush() : testarPush(estado.config, estado.id)
    } catch (error) { tarefa = Promise.reject(error) }
    Promise.resolve(tarefa).then(resultado => {
      if (!vivo.current || seq !== sequencia.current) return
      setEstado(e => ({ ...e,
        id: acao === 'ativar' ? resultado : acao === 'desativar' ? null : e.id,
        nota: acao === 'ativar' ? 'Dispositivo ativado para testes. Os avisos automáticos ainda não estão ligados.'
          : acao === 'desativar' ? 'Notificações desativadas neste dispositivo.' : resultado,
      }))
    }).catch(error => {
      if (vivo.current && seq === sequencia.current) {
        setEstado(e => ({ ...e, id: acao === 'ativar' ? null : e.id, erro: error.message || 'Não foi possível concluir a operação.' }))
      }
    }).finally(() => {
      bloqueio.current = false
      if (vivo.current) setOcupado(false)
    })
  }

  if (estado.fase === 'oculto') return null
  return <section className="pn-item" aria-label="Notificações neste dispositivo" style={{ marginBottom: 20 }}>
    <h3>🔔 Notificações neste dispositivo</h3>
    <p className="pn-nota">Ativa este dispositivo e envia um teste para confirmar a receção. O envio automático para os participantes ainda está em preparação.</p>
    {estado.fase === 'carregar' && <p role="status">A preparar as notificações…</p>}
    {estado.fase === 'pronto' && <>
      <p>{estado.id ? 'Este dispositivo está ativado para testes.' : 'Este dispositivo ainda não está ativado.'}</p>
      {Notification.permission === 'denied' && <p className="pn-nota">A permissão está bloqueada. Altera-a nas definições do navegador ou da aplicação e volta a verificar.</p>}
      <div className="pn-acoes">
        {!estado.id && <button type="button" disabled={ocupado || Notification.permission === 'denied'} onClick={() => executar('ativar')}>Ativar notificações</button>}
        {estado.id && <button type="button" disabled={ocupado} onClick={() => executar('teste')}>Enviar teste</button>}
        <button type="button" disabled={ocupado} onClick={() => executar('desativar')}>Desativar neste dispositivo</button>
        <button type="button" disabled={ocupado} onClick={() => recarregar.current?.()}>Verificar dispositivo</button>
      </div>
      <p className="pn-nota">Ao saíres da conta, este dispositivo é desligado. No iPhone, usa a aplicação instalada no ecrã principal.</p>
    </>}
    {estado.fase === 'erro' && <button type="button" disabled={ocupado} onClick={() => recarregar.current?.()}>Tentar novamente</button>}
    {ocupado && <p role="status">A processar…</p>}
    {estado.nota && <p role="status" className="pn-nota">{estado.nota}</p>}
    {estado.erro && <p role="alert" className="pn-erro">{estado.erro}</p>}
  </section>
}
