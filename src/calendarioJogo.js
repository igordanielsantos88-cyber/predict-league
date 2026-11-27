const codificador = new TextEncoder()

function escapar(valor) {
  return valor.replaceAll('\\', '\\\\').replace(/\r\n|\r|\n/g, '\\n')
    .replaceAll(';', '\\;').replaceAll(',', '\\,')
}

function dobrar(linha) {
  let resultado = ''
  let tamanho = 0
  for (const caractere of linha) {
    const bytes = codificador.encode(caractere).length
    if (tamanho + bytes > 75) {
      resultado += '\r\n '
      tamanho = 1
    }
    resultado += caractere
    tamanho += bytes
  }
  return resultado
}

function dataUtc(data) {
  return new Date(data).toISOString().replace(/[-:]|\.\d{3}/g, '')
}

export function adicionarJogoAoCalendario(jogo) {
  const ligacaoJogo = new URL('/', window.location.origin)
  ligacaoJogo.searchParams.set('jogo', jogo.id)
  const evento = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Predict League//Jogos//PT',
    'BEGIN:VEVENT',
    `UID:${jogo.id}@${ligacaoJogo.hostname}`,
    `DTSTAMP:${dataUtc(Date.now())}`,
    `DTSTART:${dataUtc(jogo.kickoff)}`,
    `SUMMARY:${escapar(`${jogo.home_team} vs ${jogo.away_team}`)}`,
    `DESCRIPTION:${escapar(`Abre o jogo na Predict League: ${ligacaoJogo.href}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].map(dobrar).join('\r\n') + '\r\n'

  const url = URL.createObjectURL(new Blob([evento], { type: 'text/calendar;charset=utf-8' }))
  const ligacao = document.createElement('a')
  ligacao.href = url
  ligacao.download = 'predict-league-jogo.ics'
  document.body.append(ligacao)
  ligacao.click()
  ligacao.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
