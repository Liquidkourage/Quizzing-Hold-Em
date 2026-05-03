import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import DisplayApp from './App.tsx'
import VenueEightTablesPreview from './VenueEightTablesPreview.tsx'

function eightTableVenuePreviewEnabled(): boolean {
  const s = new URLSearchParams(window.location.search)
  if (!s.has('tablesPreview')) return false
  const v = (s.get('tablesPreview') ?? '').trim().toLowerCase()
  if (['0', 'false', 'no', 'off'].includes(v)) return false
  return true
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {eightTableVenuePreviewEnabled() ? (
      <VenueEightTablesPreview />
    ) : (
      <DisplayApp />
    )}
  </StrictMode>,
)
