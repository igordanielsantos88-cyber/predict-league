import { supabase } from './supabase'

const CHAVE_DONO = 'predict-league-push-owner-v1'
const EVENTO = 'predict-league-push-change'
let fila = Promise.resolve()
let geracao = 0
let aSair = false
let donoEmAtivacao = null

export function suportePush() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios && !navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches) {
    return 'No iPhone ou iPad, abre o Predict League pelo ícone instalado no ecrã principal.'
  }
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'Este navegador não permite ativar as notificações push. Usa a aplicação instalada ou um navegador compatível.'
  }
  return ''
}

function avisar() { window.dispatchEvent(new Event(EVENTO)) }
export function ouvirPush(callback) {
  window.addEventListener(EVENTO, callback)
  return () => window.removeEventListener(EVENTO, callback)
}
function donoLocal() { return localStorage.getItem(CHAVE_DONO) }
function exclusivo(funcao) {
  const executar = () => navigator.locks?.request
    ? navigator.locks.request('predict-league-push', funcao) : funcao()
  const tarefa = fila.then(executar, executar)
  fila = tarefa.catch(() => {})
  return tarefa
}
function limitar(promise, ms = 15000) {
  let timer
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('A operação demorou demasiado. Tenta novamente.')), ms)
  })]).finally(() => clearTimeout(timer))
}
async function confirmarUtilizador(id, versao = geracao) {
  if (aSair || versao !== geracao) throw new Error('A sessão mudou. Volta a abrir as notificações.')
  const { data, error } = await limitar(supabase.auth.getUser())
  if (error || data?.user?.id !== id || aSair || versao !== geracao) {
    throw new Error('A sessão mudou. Volta a abrir as notificações.')
  }
}
async function registoExistente() {
  if (!('serviceWorker' in navigator)) return null
  const reg = await limitar(navigator.serviceWorker.getRegistration('/'))
  if (!reg) return null
  const worker = reg.active || reg.waiting || reg.installing
  if (!worker || new URL(worker.scriptURL).pathname !== '/push-sw.js') return null
  return reg
}
async function prepararWorker() {
  const outro = await limitar(navigator.serviceWorker.getRegistration('/'))
  const worker = outro && (outro.active || outro.waiting || outro.installing)
  if (worker && new URL(worker.scriptURL).pathname !== '/push-sw.js') {
    throw new Error('Existe outro serviço instalado neste navegador. Contacta o administrador.')
  }
  await limitar(navigator.serviceWorker.register('/push-sw.js', { scope: '/', updateViaCache: 'none' }))
  const reg = await limitar(navigator.serviceWorker.ready)
  if (new URL(reg.active?.scriptURL || '/', location.origin).pathname !== '/push-sw.js') {
    throw new Error('Não foi possível preparar as notificações.')
  }
  return reg
}
async function removerLocal() {
  const reg = await registoExistente()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await limitar(sub.unsubscribe())
    if (await reg.pushManager.getSubscription()) throw new Error('Não foi possível desativar este dispositivo. Tenta novamente antes de sair.')
  }
  if (reg?.getNotifications) {
    const avisos = await reg.getNotifications()
    avisos.forEach(n => n.close())
  }
  try { localStorage.removeItem(CHAVE_DONO) } catch { /* subscrição já removida */ }
  avisar()
  return sub?.endpoint ?? null
}

async function removerServidor(endpoint) {
  if (!endpoint) return
  // Depois de unsubscribe, o endereço já não recebe novas notificações.
  // Se a limpeza remota falhar, o envio futuro tratará a resposta 410.
  try { await limitar(supabase.rpc('remover_dispositivo_push', { p_endpoint: endpoint })) } catch { /* subscrição local revogada */ }
}

export async function invocarPush(body) {
  const { data, error } = await limitar(supabase.functions.invoke('enviar-push', { body }), 30000)
  if (error) {
    let detalhe
    try { detalhe = await error.context?.clone().json() } catch { /* erro sem JSON */ }
    throw new Error(detalhe?.erro || 'Não foi possível contactar o serviço de notificações. Tenta novamente.')
  }
  if (!data || data.erro) throw new Error(data?.erro || 'Resposta inválida do serviço de notificações.')
  return data
}

export async function prepararPush(userId) {
  const versao = geracao
  await confirmarUtilizador(userId, versao)
  const config = await invocarPush({ acao: 'configuracao' })
  if (typeof config.publicKey !== 'string' || !/^[A-Za-z0-9_-]{87}$/.test(config.publicKey) || config.modo !== 'teste') {
    throw new Error('A configuração das notificações não é válida.')
  }
  const reg = await prepararWorker()
  await confirmarUtilizador(userId, versao)
  return { userId, publicKey: config.publicKey, reg }
}

export async function consultarPush(config) {
  await confirmarUtilizador(config.userId)
  const sub = await config.reg.pushManager.getSubscription()
  if (!sub || Notification.permission !== 'granted' || donoLocal() !== config.userId) return null
  const { data, error } = await limitar(supabase.from('push_subscriptions')
    .select('id').eq('endpoint', sub.endpoint).eq('user_id', config.userId).maybeSingle())
  if (error) throw new Error('Não foi possível confirmar o registo deste dispositivo.')
  return data?.id ?? null
}

export function ativarPush(config) {
  if (aSair) return Promise.reject(new Error('A sessão está a terminar.'))
  const versao = geracao
  // Executado diretamente no clique: necessário para a permissão no iPhone.
  const permissao = Notification.permission === 'granted'
    ? Promise.resolve('granted') : Notification.requestPermission()
  donoEmAtivacao = config.userId
  return exclusivo(async () => {
    let sub = null
    try {
      if (await permissao !== 'granted') throw new Error('As notificações não foram autorizadas. Podes alterar a permissão nas definições do dispositivo.')
      await confirmarUtilizador(config.userId, versao)
      sub = await config.reg.pushManager.getSubscription()
      const bytes = Uint8Array.from(atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/') + '='), c => c.charCodeAt(0))
      const anterior = sub?.options?.applicationServerKey
      const mesmaChave = anterior && new Uint8Array(anterior).length === bytes.length &&
        new Uint8Array(anterior).every((b, i) => b === bytes[i])
      if (sub && (donoLocal() !== config.userId || !mesmaChave)) {
        const endpoint = await removerLocal()
        await removerServidor(endpoint)
        sub = null
      }
      if (!sub) sub = await config.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes })
      await confirmarUtilizador(config.userId, versao)
      const dados = sub.toJSON()
      const { data, error } = await limitar(supabase.rpc('registar_dispositivo_push', {
        p_endpoint: dados.endpoint, p_p256dh: dados.keys?.p256dh, p_auth: dados.keys?.auth,
      }))
      if (error || typeof data !== 'string') throw new Error('Não foi possível registar este dispositivo. Tenta novamente.')
      await confirmarUtilizador(config.userId, versao)
      localStorage.setItem(CHAVE_DONO, config.userId)
      avisar()
      return data
    } catch (error) {
      if (sub) {
        try { await sub.unsubscribe(); await removerServidor(sub.endpoint) } catch { /* nova tentativa pela desativação */ }
      }
      avisar()
      throw error
    } finally { donoEmAtivacao = null }
  })
}

export function desativarPush() {
  ++geracao
  return exclusivo(async () => {
    const endpoint = await removerLocal()
    await removerServidor(endpoint)
  })
}
export function prepararSaidaPush() { aSair = true; return desativarPush() }
export function concluirSaidaPush() { aSair = false }

export async function testarPush(config, dispositivoId) {
  return exclusivo(async () => {
    const versao = geracao
    await confirmarUtilizador(config.userId, versao)
    if (!dispositivoId || await consultarPush(config) !== dispositivoId) throw new Error('Ativa primeiro as notificações neste dispositivo.')
    const data = await invocarPush({ acao: 'teste', dispositivoId })
    await confirmarUtilizador(config.userId, versao)
    if (data.aceite !== true) throw new Error('O serviço não confirmou a aceitação do teste.')
    return 'Teste aceite pelo serviço. Confirma se recebeste a notificação.'
  })
}

export function vigiarSessaoPush(aoErro) {
  let ativo = true
  let evento = 0
  const verificar = (userId, forcar = false) => {
    let dono
    try { dono = donoLocal() || donoEmAtivacao } catch { return }
    if (!forcar && (!dono || dono === userId)) return
    ++geracao
    // Sem chamadas Supabase no callback de autenticação.
    queueMicrotask(() => {
      if (ativo) exclusivo(removerLocal).catch(() => {
        if (ativo) aoErro('Não foi possível desligar as notificações da sessão anterior. Desativa-as nas definições deste dispositivo.')
      })
    })
  }
  const { data } = supabase.auth.onAuthStateChange((tipo, sessao) => {
    ++evento
    verificar(sessao?.user?.id ?? null, tipo === 'SIGNED_OUT')
  })
  const atual = evento
  supabase.auth.getSession().then(({ data, error }) => {
    if (ativo && atual === evento && !error) verificar(data?.session?.user?.id ?? null)
  }).catch(() => {})
  return () => { ativo = false; data?.subscription?.unsubscribe() }
}
