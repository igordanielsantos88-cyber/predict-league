export function criarImagemResumoJornada(nome, resumo, movimento) {
  const tela = document.createElement('canvas')
  tela.width = 1080
  tela.height = 760
  const ctx = tela.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a imagem.')

  const fundo = ctx.createLinearGradient(0, 0, tela.width, tela.height)
  fundo.addColorStop(0, '#172235')
  fundo.addColorStop(1, '#0b101a')
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, tela.width, tela.height)

  function texto(valor, x, y, tamanho, cor, largura = 920, peso = 400) {
    ctx.fillStyle = cor
    ctx.font = `${peso} ${tamanho}px Arial, sans-serif`
    ctx.fillText(String(valor), x, y, largura)
  }

  const dourado = '#f0d477'
  const branco = '#f8fafc'
  const discreto = '#cbd5e1'
  ctx.fillStyle = dourado
  ctx.fillRect(74, 66, 72, 5)
  texto('PREDICT LEAGUE', 74, 121, 25, dourado, 920, 700)
  texto(nome, 74, 204, 54, branco, 920, 700)
  texto(`${resumo.terminados} de ${resumo.total} jogos com resultado`, 74, 257, 28, discreto)

  const totais = [
    [resumo.pontos, resumo.pontos === 1 ? 'Ponto' : 'Pontos'],
    [resumo.jogos.filter(jogo => jogo.acerto === 'exato').length, 'Exatos'],
    [resumo.jogos.filter(jogo => jogo.acerto === 'tendencia').length, 'Tendências'],
  ]

  totais.forEach(([valor, etiqueta], indice) => {
    const x = 74 + indice * 322
    ctx.fillStyle = '#121b2b'
    ctx.fillRect(x, 316, 288, 177)
    texto(valor, x + 26, 400, 60, dourado, 230, 700)
    texto(etiqueta, x + 26, 454, 28, branco, 230, 700)
  })

  ctx.fillStyle = '#536074'
  ctx.fillRect(74, 556, 932, 1)
  texto('CLASSIFICAÇÃO GERAL', 74, 617, 21, dourado, 920, 700)
  texto(movimento, 74, 674, 33, branco)

  const base64 = tela.toDataURL('image/png').split(',')[1]
  const bytes = Uint8Array.from(atob(base64), caractere => caractere.charCodeAt(0))
  return new File([bytes], 'predict-league-resumo-jornada.png', { type: 'image/png' })
}

export function descarregarImagem(imagem) {
  const url = URL.createObjectURL(imagem)
  const ligacao = document.createElement('a')
  ligacao.href = url
  ligacao.download = imagem.name
  document.body.append(ligacao)
  ligacao.click()
  ligacao.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
