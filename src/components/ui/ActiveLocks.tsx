import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { wsEvents } from '@/lib/wsEvents'
import { Lock } from 'lucide-react'
import { clsx } from 'clsx'

// Lock #1001 is shared by BOTH ticks/regular (T-0·T-1·T-2) and ticks/backfill.
// Lock #1002 is shared by both candles/regular and candles/backfill.
const LOCK_NAMES: Record<string, { label: string; detail: string }> = {
  '1001': { label: 'Ticks',       detail: 'Regular · Backfill' },
  '1002': { label: 'Candles',     detail: 'Regular · Backfill' },
  '1003': { label: 'Maintenance', detail: 'Seeder · Gap Fill · Pruner' },
  '1004': { label: 'Sync',        detail: 'Outbox Drain' },
}

/** Format seconds into a human-readable duration: "2m 14s", "1h 3m 5s", etc. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (m > 0 && s > 0) return `${h}h ${m}m ${s}s`
  if (m > 0)          return `${h}h ${m}m`
  return `${h}h`
}

/** Held > 30 min → amber warning; > 2h → rose alert (likely stuck). */
function durationColor(seconds: number): string {
  if (seconds > 7200) return 'text-rose-400 border-rose-500/30 bg-rose-500/10'
  if (seconds > 1800) return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
}

// ─── Live timer badge ─────────────────────────────────────────────────────────

interface LockBadgeProps {
  lockId: string
  pid: number
  heldSince: string | null   // ISO timestamp from pg_stat_activity.query_start
  heldSecondsFallback: number // backend-computed value if held_since unavailable
}

function LockBadge({ lockId, pid, heldSince, heldSecondsFallback }: LockBadgeProps) {
  const info = LOCK_NAMES[lockId]

  // Anchor: UTC epoch when the lock was acquired.
  // Prefer held_since (exact) over the backend-computed integer (can lag 1–3s).
  const anchorMs = heldSince ? new Date(heldSince).getTime() : null

  // Live elapsed counter — ticks every second.
  const [elapsed, setElapsed] = useState<number>(() =>
    anchorMs ? Math.max(0, Math.floor((Date.now() - anchorMs) / 1000)) : heldSecondsFallback
  )

  useEffect(() => {
    // Re-seed when anchorMs changes (new lock or updated query_start).
    if (anchorMs !== null) {
      setElapsed(Math.max(0, Math.floor((Date.now() - anchorMs) / 1000)))
    } else {
      setElapsed(heldSecondsFallback)
    }

    const id = setInterval(() => {
      setElapsed(anchorMs !== null
        ? Math.max(0, Math.floor((Date.now() - anchorMs) / 1000))
        : (prev) => prev + 1
      )
    }, 1000)
    return () => clearInterval(id)
  }, [anchorMs, heldSecondsFallback])

  const durColor = durationColor(elapsed)
  const formatted = formatDuration(elapsed)

  return (
    <span
      title={`Lock #${lockId} · PID ${pid} · ${info?.detail ?? 'unknown'} · held ${formatted}`}
      className={clsx(
        'flex items-center gap-1.5 font-mono text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors duration-300',
        durColor
      )}
    >
      {info?.label ?? `Lock #${lockId}`}

      {/* Live ticking timer */}
      <span className="flex items-center gap-0.5 tabular-nums opacity-80">
        ⏱ {formatted}
      </span>
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActiveLocks() {
  const queryClient = useQueryClient()

  // Initial fetch — populates the cache on first render.
  const { data: locks } = useQuery({
    queryKey: ['system', 'locks'],
    queryFn: api.control.locks,
    refetchInterval: false, // WS pushes updates; no polling needed
    staleTime: Infinity,
  })

  // Real-time: backend broadcasts lock changes via WebSocket.
  // Directly update the React Query cache so all subscribers re-render instantly.
  useEffect(() => {
    return wsEvents.on('locks', (data) => {
      queryClient.setQueryData(['system', 'locks'], data)
    })
  }, [queryClient])

  const activeLocks = (locks ?? []).filter((l: any) => l.granted)

  if (activeLocks.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex-shrink-0">
        <Lock size={10} /> Active Locks:
      </span>

      {activeLocks.map((l: any) => (
        <LockBadge
          key={l.lock_id}
          lockId={l.lock_id}
          pid={l.pid}
          heldSince={l.held_since ?? null}
          heldSecondsFallback={l.held_seconds ?? 0}
        />
      ))}
    </div>
  )
}
