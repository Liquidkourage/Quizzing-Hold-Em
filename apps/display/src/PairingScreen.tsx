import { connectDisplayAwaitingPairing } from '@qhe/net'
import { useEffect, useRef, useState } from 'react'

export default function PairingScreen({ onPaired }: { onPaired: (venueCode: string) => void }) {
  const [code, setCode] = useState('')
  const keepSock = useRef(false)

  useEffect(() => {
    keepSock.current = false
    const teardown = connectDisplayAwaitingPairing("Quizz'em TV", {
      onPairingCode: setCode,
      onVenueAssigned: (venueCode) => {
        keepSock.current = true
        onPaired(venueCode)
      },
    })
    return () => teardown({ keepConnected: keepSock.current })
  }, [onPaired])

  return (
    <div className="relative flex min-h-[100dvh] w-screen items-center justify-center overflow-hidden bg-[#070d1f] px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.38]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 50% 18%, rgba(59, 130, 246, 0.12), transparent 52%),
            radial-gradient(circle at 82% 88%, rgba(99, 102, 241, 0.08), transparent 42%),
            radial-gradient(#ffffff 0.85px, transparent 0.85px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 28px 28px',
          backgroundPosition: '0 0, 0 0, 14px 14px',
        }}
      />
      <div className="relative z-[1] w-full max-w-lg rounded-2xl border border-white/[0.08] bg-black/55 px-10 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <p className="text-center text-sm font-bold uppercase tracking-[0.28em] text-white/45 md:text-base">
          Connect display
        </p>
        <h1 className="mt-3 text-center font-['Orbitron',sans-serif] text-5xl font-black tracking-tight text-white md:text-6xl">
          Quizz&apos;em TV
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-center text-lg leading-relaxed text-white/75 md:text-xl">
          Enter this code in the host app (Venue &amp; roster, &quot;Public TVs&quot;) so this screen joins your event.
        </p>

        <div className="mt-10 flex justify-center">
          <div className="min-w-[12.5rem] rounded-xl border-[3px] border-sky-500/95 px-8 py-5 text-center shadow-[0_0_32px_rgba(56,189,248,0.38)]">
            {code.length === 4 ? (
              <span className="inline-block select-none font-mono text-6xl font-bold tracking-[0.18em] text-white md:text-7xl">
                {code}
              </span>
            ) : (
              <span className="inline-block animate-pulse text-xl tracking-wide text-white/45 md:text-2xl">
                Connecting…
              </span>
            )}
          </div>
        </div>

        <p className="mt-10 text-center text-sm leading-relaxed text-white/42 md:text-base">
          For a fixed bookmark (no pairing), load{' '}
          <code className="rounded bg-white/10 px-2 py-1 font-mono text-sm text-sky-200/90 md:text-base">
            /display?room=VENUE
          </code>
          .
        </p>
      </div>
    </div>
  )
}
