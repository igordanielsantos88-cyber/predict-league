type Golos = { home?: number | null; away?: number | null };
type ResultadoFornecedor = {
  id?: number;
  status?: string;
  score?: { duration?: string; fullTime?: Golos; regularTime?: Golos };
};

export function lerResultadoOficial(payload: unknown, id: number) {
  const jogo = payload as ResultadoFornecedor | null;
  if (jogo?.id !== id) return { estado: 'invalido' } as const;
  if (jogo.status !== 'FINISHED') return { estado: 'por_confirmar' } as const;

  const duracao = jogo.score?.duration;
  const golos = duracao === 'REGULAR' ? jogo.score?.fullTime : jogo.score?.regularTime;
  if ((duracao !== 'REGULAR' && duracao !== 'EXTRA_TIME' && duracao !== 'PENALTY_SHOOTOUT') ||
      typeof golos?.home !== 'number' || !Number.isInteger(golos.home) || golos.home < 0 ||
      typeof golos.away !== 'number' || !Number.isInteger(golos.away) || golos.away < 0) {
    return { estado: 'sem_marcador' } as const;
  }
  return { estado: 'disponivel', casa: golos.home, fora: golos.away, houveDesempate: duracao !== 'REGULAR' } as const;
}
