import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { timingSafeEqual } from 'node:crypto';
import { validarCalendario } from './fixtures.ts';
import { codigoEuropeu, competicaoValida } from './competicoes.ts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async req => {
  const responder = (status: number, dados: Record<string, unknown>) =>
    Response.json(dados, { status, headers: { ...cors, 'Cache-Control': 'no-store' } });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return responder(405, { erro: 'Método não permitido.' });

  const url = Deno.env.get('SUPABASE_URL');
  const role = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !role) return responder(503, { erro: 'A função ainda não está configurada.' });

  const db = createClient(url, role, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(25000) }) },
  });
  const recebido = req.headers.get('x-calendar-cron-secret');
  const agendado = recebido !== null;
  if (agendado) {
    const segredo = Deno.env.get('CALENDAR_CRON_SECRET') ?? '';
    const encoder = new TextEncoder();
    if (!/^[0-9a-f]{64}$/.test(segredo) || !/^[0-9a-f]{64}$/.test(recebido) ||
        !timingSafeEqual(encoder.encode(segredo), encoder.encode(recebido))) {
      return responder(401, { erro: 'Pedido não autorizado.' });
    }
  } else {
    const token = req.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return responder(401, { erro: 'Inicia sessão para consultar o calendário.' });
    const { data: sessao, error } = await db.auth.getUser(token);
    if (error || !sessao.user) return responder(401, { erro: 'Sessão inválida.' });
    const { data: perfil } = await db.from('profiles').select('role,approval_status')
      .eq('id', sessao.user.id).maybeSingle();
    if (perfil?.role !== 'admin' || perfil.approval_status !== 'approved') {
      return responder(403, { erro: 'Calendário reservado a administradores.' });
    }
  }

  let body: { epocaId?: string; previa?: boolean; acao?: string; competicao?: string;
    ano?: number; jornadaId?: string; ids?: number[]; destinos?: Record<string, string> } | null;
  try { body = await req.json(); } catch { return responder(400, { erro: 'Pedido inválido.' }); }
  if (typeof body?.epocaId !== 'string' || !uuid.test(body.epocaId) ||
      (!agendado && body.acao == null && typeof body.previa !== 'boolean')) {
    return responder(400, { erro: 'Época ou operação inválida.' });
  }

  if (body.acao != null) {
    if (agendado || !['listar', 'importar'].includes(body.acao) || !competicaoValida(body.competicao) ||
        !Number.isInteger(body.ano) || body.ano! < 2000 || body.ano! > 2100) {
      return responder(400, { erro: 'Consulta de competições inválida.' });
    }
    if (body.acao === 'importar' && (
        typeof body.jornadaId !== 'string' || !uuid.test(body.jornadaId) ||
        !Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 40 ||
        body.ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(body.ids).size !== body.ids.length
    )) return responder(400, { erro: 'Escolhe uma jornada e até 40 jogos.' });

    if (body.acao === 'importar' && body.destinos != null) {
      const destinos = body.ids!.map(id => body.destinos?.[id]);
      const locais = destinos.filter(destino => destino !== 'novo');
      if (destinos.some(destino => typeof destino !== 'string' || (destino !== 'novo' && !uuid.test(destino.replace(/^importado:/, '')))) ||
          new Set(locais.map(destino => destino?.replace(/^importado:/, ''))).size !== locais.length) {
        return responder(400, { erro: 'Escolhe uma ação para cada jogo e evita associar o mesmo cartão duas vezes.' });
      }
    }

    const token = Deno.env.get('FOOTBALL_DATA_TOKEN')?.trim();
    if (!token) return responder(503, { erro: 'Falta configurar FOOTBALL_DATA_TOKEN na função.' });

    try {
      const consultar = (url: URL) => fetch(url, {
        headers: { 'X-Auth-Token': token }, redirect: 'error', signal: AbortSignal.timeout(9000),
      });
      let codigo = body.competicao;
      if (codigo === 'EL' || codigo === 'UECL') {
        const catalogo = await consultar(new URL('https://api.football-data.org/v4/competitions'));
        if (!catalogo.ok) return responder(502, { erro: `Não foi possível consultar o plano (HTTP ${catalogo.status}).` });
        const codigoFornecedor = codigoEuropeu(codigo, await catalogo.json());
        if (!codigoFornecedor) return responder(404, { erro: 'Esta competição não aparece no catálogo devolvido pelo teu plano.' });
        codigo = codigoFornecedor;
      }
      const urlJogos = new URL(`https://api.football-data.org/v4/competitions/${codigo}/matches`);
      urlJogos.searchParams.set('season', String(body.ano));
      const resposta = await consultar(urlJogos);
      if (!resposta.ok) {
        const erro = resposta.status === 403 ? 'O teu plano não dá acesso a estes jogos.'
          : resposta.status === 429 ? 'Limite de pedidos da Football-Data.org atingido. Tenta daqui a um minuto.'
            : `A Football-Data.org devolveu HTTP ${resposta.status} para esta competição e época.`;
        return responder(502, { erro });
      }
      const agora = Date.now();
      const jogos = validarCalendario(await resposta.json(), body.ano!, codigo, false)
        .filter(jogo => jogo.estado === 'TIMED' && jogo.hora &&
          Date.parse(jogo.hora) > agora && Date.parse(jogo.hora) <= agora + 45 * 86400000);
      if (body.acao === 'listar') {
        return responder(200, { jogos: jogos.map(({ id, ronda, hora, casa, fora }) => ({ id, ronda, hora, casa, fora })) });
      }
      const ids = new Set(body.ids);
      const selecionados = jogos.filter(jogo => ids.has(jogo.id!)).map(jogo => {
        const destino = body.destinos?.[jogo.id!];
        return { ...jogo, novo: destino === 'novo', manter_importado: destino?.startsWith('importado:') ?? false,
          destino: destino && destino !== 'novo' ? destino.replace(/^importado:/, '') : null };
      });
      if (selecionados.length !== ids.size) {
        return responder(409, { erro: 'Algum jogo já não tem hora confirmada ou saiu do intervalo. Atualiza a prévia.' });
      }
      const { data, error } = await db.rpc('importar_jogos_selecionados', {
        p_epoca: body.epocaId, p_jornada: body.jornadaId, p_competicao: body.competicao, p_jogos: selecionados,
      });
      if (error) return responder(409, { erro: 'Não foi possível importar. Confirma se a jornada pertence à época ativa.' });
      return responder(200, data);
    } catch {
      return responder(502, { erro: 'Não foi possível obter os jogos da Football-Data.org.' });
    }
  }

  const { data: config, error: erroConfig } = await db.from('calendar_sync_settings')
    .select('season_year,round_offset,enabled,seasons!inner(status)').eq('season_id', body.epocaId)
    .eq('seasons.status', 'active').maybeSingle();
  if (erroConfig) return responder(503, { erro: 'Não foi possível consultar a configuração.' });
  if (!config || (agendado && !config.enabled)) {
    return responder(409, { erro: 'Configura a época ativa antes de sincronizar.' });
  }

  const token = Deno.env.get('FOOTBALL_DATA_TOKEN')?.trim();
  if (!token) return responder(503, { erro: 'Falta configurar FOOTBALL_DATA_TOKEN na função.' });

  try {
    const fornecedor = new URL('https://api.football-data.org/v4/competitions/PPL/matches');
    fornecedor.searchParams.set('season', String(config.season_year));
    const fonteEm = new Date().toISOString();
    const resposta = await fetch(fornecedor, {
      headers: { 'X-Auth-Token': token },
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
    if (!resposta.ok) {
      return responder(502, { erro: `A Football-Data.org devolveu HTTP ${resposta.status} para esta época.` });
    }
    const jogos = validarCalendario(await resposta.json(), config.season_year);
    const { data, error } = await db.rpc('aplicar_calendario_liga_portugal', {
      p_epoca: body.epocaId, p_ano: config.season_year, p_desvio: config.round_offset,
      p_jogos: jogos, p_previa: !agendado && body.previa === true, p_agendado: agendado,
      p_fonte_em: fonteEm,
    });
    if (error) return responder(409, { erro: 'Não foi possível sincronizar. Confirma a configuração da época.' });
    return responder(200, data);
  } catch {
    return responder(502, { erro: 'Não foi possível obter um calendário válido da Football-Data.org.' });
  }
});
