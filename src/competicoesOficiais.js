export const competicoes = [
  ['PL', 'Premier League'],
  ['PD', 'La Liga'],
  ['SA', 'Serie A'],
  ['BL1', 'Bundesliga'],
  ['FL1', 'Ligue 1'],
  ['PPL', 'Liga Portugal'],
  ['CL', 'Champions League'],
  ['EL', 'Liga Europa'],
  ['UECL', 'Liga Conferência'],
]

export function anoDaEpoca(data = new Date()) {
  return String(data.getFullYear() - (data.getMonth() < 6 ? 1 : 0))
}
