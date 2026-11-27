// Predict League: consumidor privado da fila. Não substitui enviar-push.
// verify_jwt=false APENAS nesta função; x-push-cron-secret é obrigatório.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import webpush from 'npm:web-push@3.6.7';
import { timingSafeEqual } from 'node:crypto';

export function endpointPermitido(endpoint: string): boolean {
  try {
    if (endpoint.length > 2048 || /[\s\\]/.test(endpoint)) return false;
    const u = new URL(endpoint);
    if (u.protocol !== 'https:' || u.port || u.username || u.password || u.hash || u.pathname === '/') return false;
    return u.hostname === 'fcm.googleapis.com' || u.hostname === 'updates.push.services.mozilla.com' ||
      /^[a-z0-9-]+\.push\.apple\.com$/.test(u.hostname) ||
      /^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname);
  } catch { return false; }
}

export async function handler(req: Request): Promise<Response> {
  const responder = (status: number, data: Record<string, unknown>) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  if (req.method !== 'POST') return responder(405, { erro: 'Método não permitido.' });
  const secret = Deno.env.get('PUSH_CRON_SECRET')?.trim() ?? '';
  const received = req.headers.get('x-push-cron-secret') ?? '';
  if (!/^[0-9a-f]{64}$/.test(secret)) return responder(503, { erro: 'Configuração incompleta.' });
  if (!/^[0-9a-f]{64}$/.test(received) || !timingSafeEqual(new TextEncoder().encode(secret), new TextEncoder().encode(received))) {
    return responder(401, { erro: 'Pedido não autorizado.' });
  }
  // Não aceita destinatários ou mensagens do pedido: tudo vem da fila privada.
  await req.body?.cancel();
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')?.trim();
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')?.trim();
  const subject = Deno.env.get('VAPID_SUBJECT')?.trim();
  if (!url || !key || !publicKey || !privateKey || !subject ||
      !/^[A-Za-z0-9_-]{87}$/.test(publicKey) || !/^[A-Za-z0-9_-]{43}$/.test(privateKey)) {
    return responder(503, { erro: 'Configuração incompleta.' });
  }
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  });
  const inicio = Date.now();
  let processados = 0, aceites = 0;
  async function rpc(nome: string, args = {}) {
    const { data, error } = await db.rpc(nome, args);
    if (error) throw new Error('database');
    return data;
  }
  try {
    // Lotes pequenos. Não há trabalho em segundo plano depois da resposta HTTP.
    while (processados < 5 && Date.now() - inicio < 20000) {
      const item = await rpc('reservar_envio_push');
      if (!item) break;
      const concluir = (estado: string, http: number | null, erro: string | null, snapshot = item) =>
        rpc('concluir_envio_push', {
          p_fila_id: item.id, p_claim_token: item.claimToken, p_estado: estado,
          p_http: http, p_erro: erro, p_p256dh: snapshot.p256dh, p_auth: snapshot.auth,
        });
      const atual = await rpc('confirmar_envio_push', { p_fila_id: item.id, p_claim_token: item.claimToken });
      if (!atual) { await concluir('cancelled', null, 'no_longer_eligible'); processados++; continue; }
      if (!endpointPermitido(atual.endpoint)) {
        await concluir('failed', null, 'endpoint_unsupported', atual); processados++; continue;
      }
      const segundos = Math.floor((Date.parse(atual.expiresAt) - Date.now()) / 1000);
      if (!Number.isFinite(segundos) || segundos < 1) {
        await concluir('cancelled', null, 'no_longer_eligible', atual); processados++; continue;
      }
      let pedido;
      try {
        pedido = webpush.generateRequestDetails({ endpoint: atual.endpoint,
          keys: { p256dh: atual.p256dh, auth: atual.auth } }, JSON.stringify({
          title: Array.from(String(atual.title)).slice(0,100).join(''),
          body: Array.from(String(atual.body)).slice(0,500).join(''),
          tag: 'predict-league-' + atual.id, matchId: atual.matchId,
        }), {
          vapidDetails: { subject, publicKey, privateKey }, contentEncoding: 'aes128gcm',
          TTL: Math.min(60, segundos), urgency: 'normal', topic: String(atual.id).replaceAll('-', ''),
        });
      } catch {
        await concluir('failed', null, 'prepare_failed', atual); processados++; continue;
      }
      const headers = new Headers();
      for (const [k,v] of Object.entries(pedido.headers)) {
        if (k.toLowerCase() !== 'content-length') headers.set(k, String(v));
      }
      let resposta: Response;
      try {
        resposta = await fetch(atual.endpoint, { method: 'POST', headers,
          body: new Uint8Array(pedido.body), redirect: 'error', signal: AbortSignal.timeout(10000) });
      } catch {
        // Um timeout pode acontecer DEPOIS da aceitação: não arriscar duplicação.
        await concluir('uncertain', null, 'transport_uncertain', atual); processados++; continue;
      }
      const status = resposta.status;
      const retryAfter = resposta.headers.get('retry-after');
      await resposta.body?.cancel().catch(() => {});
      if (resposta.ok) {
        await concluir('accepted', status, null, atual); aceites++;
      } else if (status === 404 || status === 410) {
        await concluir('failed', status, 'subscription_expired', atual);
      } else if (status === 429 && (!retryAfter || /^\d+$/.test(retryAfter) && Number(retryAfter) <= 60)) {
        await concluir('pending', status, 'rate_limited', atual);
      } else {
        await concluir(status >= 500 ? 'uncertain' : 'failed', status, 'provider_rejected', atual);
      }
      processados++;
    }
    return responder(200, { processados, aceites });
  } catch {
    // Não devolver nem registar chaves, tokens, endpoints ou conteúdo privado.
    return responder(503, { erro: 'Processamento interrompido. Consultar os estados da fila.' });
  }
}

Deno.serve(handler);
