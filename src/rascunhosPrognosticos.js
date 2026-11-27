function chave(conta, jogo) {
  return `predict-league:rascunho:v1:${conta}:${jogo}`
}

function valores(palpite) {
  return [palpite?.casa ?? '', palpite?.fora ?? '']
}

export function lerRascunho(conta, jogo, guardado) {
  try {
    const armazenamento = window.localStorage
    const id = chave(conta, jogo.id)
    const entrada = armazenamento.getItem(id)
    if (!entrada) return null

    const { base, golos } = JSON.parse(entrada)
    const comparacao = JSON.stringify(valores(guardado))
    if (jogo.status === 'scheduled' && Date.parse(jogo.kickoff) > Date.now() &&
      base === comparacao && Array.isArray(golos) && golos.length === 2 &&
      golos.every(valor => typeof valor === 'string' && valor.length <= 32) &&
      JSON.stringify(golos) !== base) {
      return { casa: golos[0], fora: golos[1] }
    }
    armazenamento.removeItem(id)
  } catch { /* O prognóstico continua a poder ser editado sem armazenamento local. */ }
  return null
}

export function atualizarRascunho(conta, jogoId, palpite, guardado) {
  if (!conta) return
  try {
    const id = chave(conta, jogoId)
    const base = JSON.stringify(valores(guardado))
    const golos = valores(palpite)
    if (JSON.stringify(golos) === base) window.localStorage.removeItem(id)
    else window.localStorage.setItem(id, JSON.stringify({ base, golos }))
  } catch { /* O estado do formulário mantém-se disponível. */ }
}

export function removerRascunhoEnviado(conta, jogoId, palpite, guardado) {
  try {
    const id = chave(conta, jogoId)
    const enviado = JSON.stringify({ base: JSON.stringify(valores(guardado)), golos: valores(palpite) })
    if (window.localStorage.getItem(id) === enviado) window.localStorage.removeItem(id)
  } catch { /* O servidor já guardou o prognóstico. */ }
}
