/**
 * ViewportScaler — fixed 1280×768 canvas that scales up on larger screens.
 *
 * Behaviour:
 *  • Screen ≥ 1280×768  → render the app at 1280×768, then scale it UP to fill
 *                          the available window (maintaining aspect ratio, centered).
 *  • Screen < 1280×768  → show a "resolution not supported" overlay instead of
 *                          attempting to render a broken layout.
 *
 * The scale uses `transform: scale()` on the inner container. The DOM layout
 * always uses the design dimensions (1280×768), so all pixel values, rem units
 * and Tailwind classes work as designed at that resolution.
 */

import { type ReactNode, useEffect, useState } from 'react'
import { Monitor } from 'lucide-react'

const DESIGN_W = 1280
const DESIGN_H = 768

interface ScaleState {
  supported: boolean
  scale: number
  offsetX: number
  offsetY: number
}

function computeState(): ScaleState {
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (vw < DESIGN_W || vh < DESIGN_H) {
    return { supported: false, scale: 1, offsetX: 0, offsetY: 0 }
  }

  // Scale to fill the viewport while keeping the 1280×768 aspect ratio
  const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H)

  // Center the scaled canvas
  const scaledW = DESIGN_W * scale
  const scaledH = DESIGN_H * scale
  const offsetX = (vw - scaledW) / 2
  const offsetY = (vh - scaledH) / 2

  return { supported: true, scale, offsetX, offsetY }
}

interface Props {
  children: ReactNode
}

export default function ViewportScaler({ children }: Props) {
  const [state, setState] = useState<ScaleState>(computeState)

  useEffect(() => {
    function onResize() {
      setState(computeState())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Not supported ─────────────────────────────────────────────────────────
  if (!state.supported) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-[#030C18]"
        style={{ zIndex: 9999 }}
      >
        {/* Glow circle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-96 w-96 rounded-full bg-sky-500/5 blur-[120px]" />
        </div>

        <div className="relative flex flex-col items-center gap-4 text-center px-8 max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
            <Monitor size={28} className="text-rose-400" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-wide">
              Resolution Not Supported
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Geonera Cockpit requires a minimum resolution of{' '}
              <span className="font-mono font-semibold text-rose-400">
                1280 × 768
              </span>
              .
            </p>
          </div>

          <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 font-mono text-xs text-slate-400">
            <span className="text-slate-500">Current:</span>
            <span className="font-semibold text-amber-400">
              {window.innerWidth} × {window.innerHeight}
            </span>
            <span className="text-slate-600 mx-1">·</span>
            <span className="text-slate-500">Required:</span>
            <span className="font-semibold text-emerald-400">
              {DESIGN_W} × {DESIGN_H}
            </span>
          </div>

          <p className="text-[11px] text-slate-600">
            Please resize your browser window or use a larger display.
          </p>
        </div>
      </div>
    )
  }

  // ── Supported — scaled canvas ─────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 overflow-hidden bg-[#030C18]"
      style={{ zIndex: 0 }}
    >
      <div
        style={{
          position: 'absolute',
          left: state.offsetX,
          top: state.offsetY,
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${state.scale})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}
