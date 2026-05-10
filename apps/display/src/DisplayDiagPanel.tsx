import { useEffect, useState } from 'react'

/**
 * On-screen bundle / cache diagnostics. Enable with `?diag=1` on any display URL.
 * Does not ship secrets; safe for venue TVs when you need to verify a deploy.
 */
export default function DisplayDiagPanel() {
  const [probe, setProbe] = useState<{ cc: string; status: number } | null>(null)
  const [scripts, setScripts] = useState<string[]>([])

  const rootBuild =
    typeof document !== 'undefined'
      ? document.getElementById('root')?.dataset.displayBuild ?? '(missing #root or data-display-build)'
      : ''

  useEffect(() => {
    setScripts(
      [...document.querySelectorAll('script[src]')].map((s) => (s as HTMLScriptElement).getAttribute('src') ?? ''),
    )
    const origin = window.location.origin
    fetch(`${origin}/display/index.html`, { cache: 'no-store' })
      .then((r) => {
        setProbe({
          cc: r.headers.get('cache-control') ?? '(header missing)',
          status: r.status,
        })
      })
      .catch(() => {
        setProbe({ cc: '(fetch failed — check URL / mixed content)', status: 0 })
      })
  }, [])

  return (
    <div
      className="pointer-events-none fixed bottom-2 left-2 z-[9999] max-w-[min(96vw,540px)]"
      role="region"
      aria-label="Display deployment diagnostics"
    >
      <div className="pointer-events-auto rounded-lg border-2 border-emerald-400/90 bg-black/95 p-3 font-mono text-[11px] leading-snug text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.35)]">
        <p className="mb-2 font-black uppercase tracking-wide text-amber-200">Display diagnostics</p>
        <p className="mb-1 break-all">
          <span className="text-white/45">#root data-display-build</span> → <span className="text-white">{rootBuild}</span>
        </p>
        <p className="mb-1 break-all">
          <span className="text-white/45">GET /display/index.html Cache-Control</span> →{' '}
          <span className="text-white">
            {probe ? `${probe.cc} (HTTP ${probe.status})` : '…loading'}
          </span>
        </p>
        <p className="mb-2 break-all text-white/55">Page: {typeof window !== 'undefined' ? window.location.href : ''}</p>
        <p className="text-[10px] text-white/40">Script tags (expect /display/assets/index-*.js in production):</p>
        <ul className="mt-1 max-h-28 overflow-y-auto text-[10px] text-emerald-200/90">
          {scripts.filter(Boolean).map((s) => (
            <li key={s} className="truncate" title={s}>
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-amber-200/80">
          Compare <code className="text-white/90">data-display-build</code> to the first 7 chars of the deployed Git
          commit. If it says <code className="text-white/90">local</code>, the image was built without{' '}
          <code className="text-white/90">RAILWAY_GIT_COMMIT_SHA</code>. If Cache-Control lacks{' '}
          <code className="text-white/90">no-store</code>, an old shell may still be cached in front of Express.
        </p>
      </div>
    </div>
  )
}
