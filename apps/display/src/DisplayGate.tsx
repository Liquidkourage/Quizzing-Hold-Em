import { useCallback, useState } from 'react'
import DisplayRouter from './DisplayRouter.tsx'
import PairingScreen from './PairingScreen.tsx'
import { readDisplayRoomFromUrl } from './displayUrlParams'

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

  if (!venue) {
    return <PairingScreen onPaired={onPairedFromTv} />
  }

  return <DisplayRouter key={venue} venueCode={venue} pairingBootstrap={pairedViaHandshake} />
}
