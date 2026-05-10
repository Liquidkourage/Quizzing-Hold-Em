import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import DisplayGate from './DisplayGate.tsx'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Missing #root container')
}
rootEl.dataset.displayBuild = __DISPLAY_BUILD_ID__

createRoot(rootEl).render(
  <StrictMode>
    <DisplayGate />
  </StrictMode>,
)
