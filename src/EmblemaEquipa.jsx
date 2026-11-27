import { useState } from 'react'

export default function EmblemaEquipa({ nome, origem }) {
  const [falhou, setFalhou] = useState(null)
  const nomeLimpo = nome.trim()
  const palavras = nomeLimpo.split(/[\s-]+/).filter(Boolean)
  const iniciais = palavras.length > 1
    ? palavras.slice(0, 2).map(palavra => palavra[0]).join('')
    : nomeLimpo.slice(0, 2)

  return (
    <span className="pl-emblema" aria-hidden="true">
      {origem && falhou !== origem ? (
        <img src={origem} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
          onError={() => setFalhou(origem)} />
      ) : iniciais.toLocaleUpperCase('pt-PT')}
    </span>
  )
}
