// Predict League — fase 1: configuração e teste manual no próprio dispositivo.
// Não lê notificações antigas, não envia em massa e não usa service_role.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import webpush from 'npm:web-push@3.6.7';

const SITE = 'https://predict-league-eta.vercel.app';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function origemPermitida(origin: string): boolean {
  if (origin === SITE) return true;
  try {
    const u = new URL(origin);
    return u.origin === origin && u.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(u.hostname);
  } catch { return false; }
}

// Uma subscrição não autoriza pedidos HTTP para destinos arbitrários.
export function endpointPermitido(endpoint: string): boolean {
  try {
    if (endpoint.length > 2048 || /[\s\\]/.test(endpoint)) return false;
    const u = new URL(endpoint);
    if (u.protocol !== 'https:' || u.port || u.username || u.password || u.hash || u.pathname === '/') return false;
    return u.hostname === 'fcm.googleapis.com' ||
      u.hostname === 'updates.push.services.mozilla.com' ||
      /^[a-z0-9-]+\.push\.apple\.com$/.test(u.hostname) ||
      /^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname);
  } catch { return false; }
}

async function lerPedido(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('pedido');
  const reader = req.body?.getReader();
  if (!reader) throw new Error('pedido');
  const partes: Uint8Array[] = [];
  let tamanho = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      tamanho += value.byteLength;
      if (tamanho > 2048) { await reader.cancel(); throw new Error('pedido'); }
      partes.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(tamanho);
  let offset = 0;
  for (const parte of partes) { bytes.set(parte, offset); offset += parte.length; }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('pedido');
  return body;
}

export async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
  const responder = (status: number, data: Record<string, unknown>) =>
    new Response(JSON.stringify(data), { status, headers });
  if (origin && !origemPermitida(origin)) return responder(403, { erro: 'Origem não autorizada.' });
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info';
  headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return responder(405, { erro: 'Método não permitido.' });

  const authorization = req.headers.get('authorization') ?? '';
  const token = /^Bearer ([^\s]+)$/i.exec(authorization)?.[1];
  if (!token) return responder(401, { erro: 'Inicia sessão novamente.' });
  let body: Record<string, unknown>;
  try { body = await lerPedido(req); }
  catch { return responder(400, { erro: 'Pedido inválido.' }); }
  if (!['configuracao', 'teste'].includes(String(body.acao))) return responder(400, { erro: 'Ação inválida.' });
  const campos = body.acao === 'teste' ? ['acao', 'dispositivoId'] : ['acao'];
  if (Object.keys(body).some(k => !campos.includes(k))) return responder(400, { erro: 'Pedido inválido.' });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')?.trim();
    const subject = Deno.env.get('VAPID_SUBJECT')?.trim();
    if (!url || !anonKey || !publicKey || !privateKey || !subject ||
        !/^[A-Za-z0-9_-]{87}$/.test(publicKey) || !/^[A-Za-z0-9_-]{43}$/.test(privateKey)) {
      return responder(503, { erro: 'Configuração push incompleta. Contacta o administrador.' });
    }
    // Cliente por pedido, com sessão do chamador: todas as consultas respeitam RLS.
    const supabase = createClient(url, anonKey, {
      global: {
        headers: { Authorization: authorization },
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
      },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: sessao, error: erroSessao } = await supabase.auth.getUser(token);
    if (erroSessao || !sessao.user) return responder(401, { erro: 'Inicia sessão novamente.' });
    const userId = sessao.user.id;
    const { data: perfil, error: erroPerfil } = await supabase.from('profiles')
      .select('role,approval_status').eq('id', userId).maybeSingle();
    if (erroPerfil) return responder(503, { erro: 'Não foi possível verificar o perfil.' });
    if (perfil?.approval_status !== 'approved') return responder(403, { erro: 'A conta não está aprovada.' });
    const { data: membros, error: erroMembros } = await supabase.from('competition_members')
      .select('user_id').eq('user_id', userId).limit(1);
    if (erroMembros) return responder(503, { erro: 'Não foi possível verificar a inscrição.' });
    if (!membros?.length) return responder(403, { erro: 'É necessário pertencer a uma competição.' });

    if (body.acao === 'configuracao') return responder(200, { publicKey, modo: 'teste' });
    if (typeof body.dispositivoId !== 'string' || !UUID.test(body.dispositivoId)) {
      return responder(400, { erro: 'Dispositivo inválido.' });
    }
    const { data: dispositivo, error: erroDispositivo } = await supabase.from('push_subscriptions')
      .select('id,user_id,endpoint,p256dh,auth').eq('id', body.dispositivoId).eq('user_id', userId).maybeSingle();
    if (erroDispositivo) return responder(503, { erro: 'Não foi possível consultar o dispositivo.' });
    if (!dispositivo || dispositivo.user_id !== userId) return responder(404, { erro: 'Dispositivo não encontrado na tua conta.' });
    if (!endpointPermitido(dispositivo.endpoint)) return responder(400, { erro: 'Serviço push deste dispositivo não suportado.' });

    // Conteúdo fixo: o cliente não pode indicar outro utilizador, URL ou mensagem.
    let pedido;
    try {
      pedido = webpush.generateRequestDetails({
        endpoint: dispositivo.endpoint,
        keys: { p256dh: dispositivo.p256dh, auth: dispositivo.auth },
      }, JSON.stringify({
        title: 'Predict League',
        body: 'Teste recebido! As notificações deste dispositivo estão a funcionar.',
        tag: 'predict-league-teste',
        url: '/',
      }), {
        vapidDetails: { subject, publicKey, privateKey },
        contentEncoding: 'aes128gcm', TTL: 60, urgency: 'high',
      });
    } catch { return responder(503, { erro: 'Não foi possível preparar o envio. Verifica as chaves e volta a ativar o dispositivo.' }); }
    const pushHeaders = new Headers();
    for (const [name, value] of Object.entries(pedido.headers)) {
      if (name.toLowerCase() !== 'content-length') pushHeaders.set(name, String(value));
    }
    // Sem redirecionamentos: nunca encaminha credenciais para outro destino.
    const resultado = await fetch(dispositivo.endpoint, {
      method: 'POST', headers: pushHeaders, body: new Uint8Array(pedido.body),
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    await resultado.body?.cancel();
    if (resultado.status === 404 || resultado.status === 410) {
      // Remove só a subscrição expirada e só se as chaves não foram entretanto renovadas.
      const { error } = await supabase.from('push_subscriptions').delete()
        .eq('id', dispositivo.id).eq('user_id', userId)
        .eq('p256dh', dispositivo.p256dh).eq('auth', dispositivo.auth);
      return responder(410, { erro: error
        ? 'O dispositivo expirou. Desativa e volta a ativar as notificações.'
        : 'O dispositivo expirou. Volta a ativar as notificações.' });
    }
    if (!resultado.ok) return responder(502, {
      erro: 'O serviço push não aceitou o teste.', codigoServico: resultado.status,
    });
    return responder(200, { aceite: true, mensagem: 'Teste aceite pelo serviço push. Confirma se recebeste a notificação.' });
  } catch {
    // Não registar tokens, endpoints privados, chaves ou respostas dos fornecedores.
    return responder(503, { erro: 'Não foi possível concluir o pedido. Tenta novamente.' });
  }
}

Deno.serve(handler);
