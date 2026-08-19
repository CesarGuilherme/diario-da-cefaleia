import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import Publico from './Publico.tsx'

// /r/<token> é o relatório público: monta antes do App, que exigiria sessão e mandaria
// o médico para a tela de login.
const publico = location.pathname.match(/^\/r\/([0-9a-f-]{36})\/?$/i)

createRoot(document.getElementById('root')!).render(
  <StrictMode>{publico?.[1] ? <Publico token={publico[1]} /> : <App />}</StrictMode>,
)
