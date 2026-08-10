import { useEffect, useState } from 'react'

// O breakpoint é uma media query de verdade, não um listener de resize: o browser
// já sabe responder isso. 1024px deixa iPad em retrato com o layout de telefone.
const MQ = '(min-width: 1024px)'

export function useDesktop() {
  const [desktop, setDesktop] = useState(() => matchMedia(MQ).matches)
  useEffect(() => {
    const mq = matchMedia(MQ)
    const ouve = (e) => setDesktop(e.matches)
    mq.addEventListener('change', ouve)
    return () => mq.removeEventListener('change', ouve)
  }, [])
  return desktop
}
