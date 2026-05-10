import { useCallback, useMemo, useState } from 'react'
import DisplayDiagPanel from './DisplayDiagPanel.tsx'
import DisplayRouter from './DisplayRouter.tsx'
import PairingScreen from './PairingScreen.tsx'
import { readDisplayDiagFromUrl, readDisplayRoomFromUrl } from './displayUrlParams'

type GateState = { venue: string | null; pairedViaHandshake: boolean }

export default function DisplayGate() {
  const [{ venue, pairedViaHandshake }, setGate] = useState<GateState>(() => {
    if (typeof window === 'undefined') {
      return { venue: null, pairedViaHandshake: false }
    }
    const room = readDisplayRoomFromUrl()
    return { venue: room, pairedViaHandshake: false }
  })

  const onPairedFromTv = useCallback((vc: string) => {
    setGate({ venue: vc, pairedViaHandshake: true })
  }, [])

  const showDiag = useMemo(() => readDisplayDiagFromUrl(), [])

  if (!venue) {
    return (
      <>
        {showDiag ? <DisplayDiagPanel /> : null}
        <PairingScreen onPaired={onPairedFromTv} />
      </>
    )
  }

  return (
    <>
      {showDiag ? <DisplayDiagPanel /> : null}
      <DisplayRouter key={venue} venueCode={venue} pairingBootstrap={pairedViaHandshake} />
    </>
  )
}
