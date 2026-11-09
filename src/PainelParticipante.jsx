import Liga from './Liga'
import JogosParticipante from './JogosParticipante'
function PainelParticipante() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1220',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      padding: '25px',
    }}>
      <h1 style={{ color: '#22c55e' }}>
        ⚽ Predict League
      </h1>

      <h2>🏆 Área do Participante</h2>

      <p>Bem-vindo à tua competição!</p>

      <div style={{
  background: '#172235',
  padding: '20px',
  borderRadius: '12px',
  marginTop: '20px',
}}>
  <h3>🎯 Os meus prognósticos</h3>
  <JogosParticipante />
</div>

      <div style={{
  background: '#172235',
  padding: '20px',
  borderRadius: '12px',
  marginTop: '15px',
}}>
    <Liga />
</div>

    </div>
  )
}

export default PainelParticipante
