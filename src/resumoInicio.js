import { supabase } from './supabase'

const camposJogo = 'id,home_team,away_team,home_crest,away_crest,kickoff'

export async function obterResumoInicio(competicaoId, signal) {
  const { data: { user }, error: erroUser } = await supabase.auth.getUser()
  if (erroUser || !user) throw new Error('Não foi possível identificar o utilizador.')

  const [classificacao, epoca] = await Promise.all([
    supabase.rpc('obter_classificacao', { p_competition_id: competicaoId }).abortSignal(signal),
    supabase.from('seasons').select('id').eq('competition_id', competicaoId)
      .eq('status', 'active').maybeSingle().abortSignal(signal),
  ])
  if (classificacao.error) throw classificacao.error
  if (epoca.error) throw epoca.error
  signal.throwIfAborted()

  const tabela = classificacao.data || []
  const indice = tabela.findIndex(jogador => jogador.user_id === user.id)
  const resumo = {
    posicao: indice >= 0 ? indice + 1 : null,
    pontos: indice >= 0 ? Number(tabela[indice].pontos) : null,
    proximos: [],
    porFazer: 0,
    totalFuturos: 0,
    proximoPendente: null,
    ultimoResultado: null,
  }
  if (!epoca.data?.id) return resumo

  const jogosDaEpoca = campos => supabase.from('matches').select(campos)
    .eq('competition_id', competicaoId).eq('season_id', epoca.data.id).not('jornada_id', 'is', null)

  const { data: jogos, error: erroJogos } = await jogosDaEpoca(camposJogo)
    .eq('status', 'scheduled').gt('kickoff', new Date().toISOString())
    .order('kickoff').order('id').abortSignal(signal)
  if (erroJogos) throw erroJogos
  signal.throwIfAborted()

  if (!jogos?.length) {
    const { data, error } = await jogosDaEpoca(`${camposJogo},home_score,away_score`)
      .eq('status', 'finished').not('home_score', 'is', null).not('away_score', 'is', null)
      .order('kickoff', { ascending: false, nullsFirst: false }).order('id').limit(1).maybeSingle()
      .abortSignal(signal)
    if (error) throw error
    return { ...resumo, ultimoResultado: data }
  }

  const { data: palpites, error: erroPalpites } = await supabase.from('predictions').select('match_id')
    .eq('user_id', user.id).in('match_id', jogos.map(jogo => jogo.id)).abortSignal(signal)
  if (erroPalpites) throw erroPalpites
  signal.throwIfAborted()

  const preenchidos = new Set((palpites || []).map(palpite => palpite.match_id))
  const futuros = jogos.map(jogo => ({ ...jogo, prognosticado: preenchidos.has(jogo.id) }))
  const pendentes = futuros.filter(jogo => !jogo.prognosticado)
  return {
    ...resumo,
    proximos: futuros.slice(0, 4),
    porFazer: pendentes.length,
    totalFuturos: futuros.length,
    proximoPendente: pendentes[0] ?? null,
  }
}
