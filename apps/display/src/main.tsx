import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import DisplayRouter from './DisplayRouter.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DisplayRouter />
  </StrictMode>,
)
