type Competicao = { code?: string; name?: string };

const codigos = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'PPL', 'CL', 'EL', 'UECL'];

export function competicaoValida(codigo: unknown): codigo is string {
  return typeof codigo === 'string' && codigos.includes(codigo);
}

export function codigoEuropeu(competicao: string, dados: unknown) {
  const catalogo = (dados as { competitions?: Competicao[] } | null)?.competitions;
  if (!Array.isArray(catalogo)) return null;
  const nome = competicao === 'EL' ? /^(?:uefa )?europa league$/i : /^(?:uefa )?(?:europa )?conference league$/i;
  const entrada = catalogo.find(item => typeof item.name === 'string' && nome.test(item.name.trim()));
  return typeof entrada?.code === 'string' && /^[A-Z0-9]{2,12}$/.test(entrada.code) ? entrada.code : null;
}
