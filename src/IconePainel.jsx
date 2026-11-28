/* Ícones locais e acessíveis: não exigem bibliotecas ou fontes externas. */
const formas = {
  inicio: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  prognosticos: <><circle cx="12" cy="12" r="9" /><path d="m12 7 4.8 3.5-1.8 5.5H9l-1.8-5.5ZM12 7V3m4.8 7.5 3.8-1.3M15 16l2.4 3.6M9 16l-2.4 3.6M7.2 10.5 3.4 9.2" /></>,
  liga: <><path d="M8 3h8v6a4 4 0 0 1-8 0ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8m-7-3h6" /></>,
  notificacoes: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  mais: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
  conquistas: <><circle cx="12" cy="9" r="6" /><path d="m8 14-2 7 6-3 6 3-2-7m-6-5 1.5 1.5L14 8" /></>,
  duelo: <><path d="m4 3 6 4-2 2 9 9 3-3 1 6-6-1 2-2M20 3l-6 4 2 2-3 3m-3 3-3 3-3-3-1 6 6-1-2-2" /></>,
  estatisticas: <><path d="M3 3v18h18M7 17v-5m5 5V7m5 10v-8" /></>,
  'hall-da-fama': <><path d="m3 6 4 5 5-7 5 7 4-5-2 12H5ZM5 21h14" /></>,
  chat: <><path d="M4 4h16v13H9l-5 4ZM8 9h8m-8 4h5" /></>,
  competicoes: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18m-14 5h4m-2-2v4" /></>,
  jornadas: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18m-13 5h2m4 0h2m-8 3h2" /></>,
  participantes: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-3a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v3m2-15a3 3 0 0 1 0 6m1 2a4 4 0 0 1 3 4v3" /></>,
  'diagnostico-push': <><path d="M3 12h4l3-7 4 14 3-7h4" /></>,
  voltar: <><path d="m14 6-6 6 6 6M8 12h13" /></>,
}
export default function IconePainel({ nome, tamanho = 22 }) {
  return (
    <svg className="pl-icon" width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false">
      {formas[nome] || formas.mais}
    </svg>
  )
}
export function MarcaPredictLeague() {
  return <img className="pl-brand-image" src="/pwa-icons/apple-touch-icon.png" alt="" width="180" height="180" decoding="async" />
}
