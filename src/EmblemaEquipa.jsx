import { useState } from 'react'

export default function EmblemaEquipa({ nome, origem, aoCorrigir, aoFalhar }) {
  const [falhou, setFalhou] = useState(null)
  const nomeLimpo = nome.trim()
  const palavras = nomeLimpo.split(/[\s-]+/).filter(Boolean)
  const iniciais = palavras.length > 1
    ? palavras.slice(0, 2).map(palavra => palavra[0]).join('')
    : nomeLimpo.slice(0, 2)

  const mostrarImagem = origem && falhou !== origem
  const texto = iniciais.toLocaleUpperCase('pt-PT')
  if (!mostrarImagem && aoCorrigir) {
    return (
      <button type="button" className="pl-emblema pl-emblema-corrigir"
        aria-label={`Corrigir emblema de ${nome}`} title={`Corrigir emblema de ${nome}`} onClick={aoCorrigir}>
        {texto}
      </button>
    )
  }

  return (
    <span className="pl-emblema" aria-hidden="true">
      {mostrarImagem ? (
        <img src={origem} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
          onError={() => { setFalhou(origem); aoFalhar?.(origem) }} />
      ) : texto}
    </span>
  )
}
