import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import DisplayGate from './DisplayGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DisplayGate />
  </StrictMode>,
)
