export function descreverMovimento(antes, depois) {
  if (antes == null || depois == null) return 'Movimento indisponível para esta jornada.'
  const diferenca = Math.abs(antes - depois)
  if (!diferenca) return `Mantiveste a posição ${depois}.º.`
  const sentido = antes > depois ? 'Subiste' : 'Desceste'
  return `${sentido} ${diferenca} ${diferenca === 1 ? 'posição' : 'posições'} (${antes}.º → ${depois}.º).`
}
