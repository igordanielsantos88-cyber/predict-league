type Equipa = { id?: number; name?: string; shortName?: string; tla?: string; crest?: string };
type JogoApi = {
  id?: number;
  matchday?: number;
  utcDate?: string | null;
  status?: string;
  season?: { startDate?: string };
  homeTeam?: Equipa;
  awayTeam?: Equipa;
};

function nomes(equipa: Equipa): string[] {
  const reduzir = (nome: string) => nome.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '');
  const nomes = [equipa.name, equipa.shortName, equipa.tla].filter((nome): nome is string => !!nome);
  return [...new Set(nomes.flatMap(nome => [
    reduzir(nome),
    reduzir(nome.replace(/\b(?:fc|cf|sc|cd|ac|cp|sl)\b/gi, '')),
  ]).filter(Boolean))];
}

function emblema(valor: unknown) {
  return typeof valor === 'string' && /^https:\/\/crests\.football-data\.org\/[a-z0-9_-]{1,100}\.(svg|png|webp)$/i.test(valor)
    ? valor : null;
}

export function lerClubesOficiais(dados: unknown) {
  const equipas = (dados as { teams?: Equipa[] } | null)?.teams;
  if (!Array.isArray(equipas) || equipas.length > 650) throw new Error('Catálogo de clubes inválido.');

  const clubes = new Map<number, { id: number; nome: string; emblema: string }>();
  for (const equipa of equipas) {
    const id = equipa?.id;
    const nome = typeof equipa?.name === 'string' ? equipa.name.trim() : '';
    const imagem = emblema(equipa?.crest);
    if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && nome && nome.length <= 120 && imagem) {
      clubes.set(id, { id, nome, emblema: imagem });
    }
  }
  return [...clubes.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-PT'));
}

export function validarCalendario(dados: unknown, ano: number, codigo = 'PPL', exigirJornada = true) {
  const resposta = dados as { competition?: { code?: string }; matches?: JogoApi[] } | null;
  if (resposta?.competition?.code !== codigo || !Array.isArray(resposta.matches) ||
      (exigirJornada && !resposta.matches.length) || resposta.matches.length > (exigirJornada ? 360 : 650)) {
    throw new Error('Calendário indisponível para esta competição e época.');
  }
  const ids = new Set<number>();
  return resposta.matches.map(jogo => {
    if (!jogo || !Number.isSafeInteger(jogo.id) || jogo.id! < 1 || ids.has(jogo.id!) ||
        (exigirJornada && (!Number.isInteger(jogo.matchday) || jogo.matchday! < 1 || jogo.matchday! > 34)) ||
        jogo.season?.startDate?.slice(0, 4) !== String(ano) ||
        typeof jogo.status !== 'string' || !/^[A-Z_]{3,20}$/.test(jogo.status) ||
        typeof jogo.homeTeam?.name !== 'string' || typeof jogo.awayTeam?.name !== 'string' ||
        !jogo.homeTeam.name.trim() || !jogo.awayTeam.name.trim() ||
        jogo.homeTeam.name.length > 120 || jogo.awayTeam.name.length > 120) {
      throw new Error('O fornecedor devolveu um jogo com dados incompletos.');
    }
    const hora = typeof jogo.utcDate === 'string' ? Date.parse(jogo.utcDate) : NaN;
    if (jogo.status === 'TIMED' && !Number.isFinite(hora)) {
      throw new Error('O fornecedor devolveu uma hora inválida.');
    }
    ids.add(jogo.id!);
    return {
      id: jogo.id, ronda: jogo.matchday ?? null, hora: Number.isFinite(hora) ? new Date(hora).toISOString() : null,
      estado: jogo.status, casa: jogo.homeTeam.shortName?.trim() || jogo.homeTeam.name.trim(),
      fora: jogo.awayTeam.shortName?.trim() || jogo.awayTeam.name.trim(),
      casas: nomes(jogo.homeTeam), foras: nomes(jogo.awayTeam),
      emblema_casa: emblema(jogo.homeTeam.crest), emblema_fora: emblema(jogo.awayTeam.crest),
    };
  });
}
