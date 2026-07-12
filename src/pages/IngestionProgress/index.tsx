import { useRealtimeQuery } from '@/hooks/useRealtimeQuery'
import {
  BarChart2,
  CheckCircle2,
  Clock,
  PauseCircle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { ActiveLocks } from '@/components/ui/ActiveLocks'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { api } from '@/lib/api'
import type { ProgressEntry } from '@/types'
import { clsx } from 'clsx'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString() }

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
}

function progressColor(pct: number): string {
  if (pct >= 95) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-sky-500'
  if (pct >= 20) return 'bg-amber-500'
  return 'bg-rose-500/80'
}

function badgeColor(pct: number): string {
  if (pct >= 95) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (pct >= 50) return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
  if (pct >= 20) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
}

// ─── Summary KPI (compact) ────────────────────────────────────────────────────

function SummaryKpi({
  label, confirmed, total, pct, icon: Icon, barColor, iconColor,
}: {
  label: string; confirmed: number; total: number; pct: number
  icon: React.ElementType; barColor: string; iconColor: string
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-sky-200/70 bg-white/90 px-4 py-3.5 shadow-md dark:border-sky-900/30 dark:bg-[#111520]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx('flex h-7 w-7 items-center justify-center rounded-lg border border-sky-200/70 dark:border-slate-700/60', iconColor)}>
            <Icon size={13} strokeWidth={2.2} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        </div>
        <span className={clsx('rounded border px-2 py-0.5 text-[11px] font-bold tabular-nums', badgeColor(pct))}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full border border-sky-200/70 bg-sky-100/80 p-[1px] dark:border-slate-800/60 dark:bg-[#071628]">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${pct}%`, minWidth: pct > 0 ? '3px' : '0' }}
        />
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-base font-bold tabular-nums text-sky-900 dark:text-slate-100">{fmt(confirmed)}</span>
        <span className="text-[10px] text-slate-500 font-mono">/ {fmt(total)}</span>
      </div>
    </div>
  )
}

// ─── Instrument card (compact, scales to 64+) ─────────────────────────────────

function InstrumentCard({ entry }: { entry: ProgressEntry }) {
  const tickRemaining   = Math.max(0, entry.expectedTickHours - entry.tickConfirmed)
  const candleRemaining = Math.max(0, entry.expectedCandleDays - entry.candleConfirmed)

  return (
    <div className="glow-card flex flex-col overflow-hidden rounded-xl border border-sky-200/70 bg-white/90 shadow dark:border-sky-900/30 dark:bg-[#111520]">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-sky-200/70 px-4 py-2.5 dark:border-slate-800/50">
        <div className="flex items-center gap-2 min-w-0">
          {entry.isPause
            ? <PauseCircle size={12} className="flex-shrink-0 text-amber-400 animate-pulse" />
            : <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(52,211,153,0.7)] animate-pulse flex-shrink-0" />
          }
          <span className="truncate font-mono text-xs font-bold uppercase tracking-widest text-sky-900 dark:text-slate-100">
            {entry.instrumentName}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={clsx('rounded border px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider', badgeColor(entry.tickProgress))}>
            {entry.tickProgress}%T
          </span>
          <span className={clsx('rounded border px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider', badgeColor(entry.candleProgress))}>
            {entry.candleProgress}%C
          </span>
        </div>
      </div>

      {/* ── Progress bars ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 px-4 py-3">
        {/* TICK */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tick</span>
            <span className="font-mono text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
              <span className="font-bold text-sky-600 dark:text-sky-400">{fmt(entry.tickConfirmed)}</span>
              <span className="text-slate-600"> / {fmt(entry.expectedTickHours)}</span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-sky-200/70 bg-sky-100/80 p-[1.5px] dark:border-slate-800/50 dark:bg-[#071628]">
            <div
              className={clsx('h-full rounded-full transition-all duration-700 ease-out', progressColor(entry.tickProgress))}
              style={{ width: `${entry.tickProgress}%`, minWidth: entry.tickProgress > 0 ? '4px' : '0' }}
            />
          </div>
        </div>

        {/* CANDLE */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Candle</span>
            <span className="font-mono text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
              <span className="font-bold text-pink-600 dark:text-pink-400">{fmt(entry.candleConfirmed)}</span>
              <span className="text-slate-600"> / {fmt(entry.expectedCandleDays)}</span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-sky-200/70 bg-sky-100/80 p-[1.5px] dark:border-slate-800/50 dark:bg-[#071628]">
            <div
              className={clsx('h-full rounded-full transition-all duration-700 ease-out', progressColor(entry.candleProgress))}
              style={{ width: `${entry.candleProgress}%`, minWidth: entry.candleProgress > 0 ? '4px' : '0' }}
            />
          </div>
        </div>
      </div>

      {/* ── Remaining + dates footer ─────────────────────────────────── */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-sky-200/70 bg-sky-50/80 px-4 py-2 dark:border-slate-800/40 dark:bg-[#0B0F19]/60">
        <div className="flex items-center gap-1 text-[10px] text-slate-500 min-w-0">
          <Clock size={10} className="flex-shrink-0" />
          <span className="truncate">
            <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">{fmt(tickRemaining)}</span>T
            {' · '}
            <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">{fmt(candleRemaining)}</span>C
            {' left'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600 flex-shrink-0 font-mono">
          <span title="Latest confirmed TICK">⏱{fmtDate(entry.latestTickDate)}</span>
          <span title="Latest confirmed CANDLE">🕯{fmtDate(entry.latestCandleDate)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton (compact) ───────────────────────────────────────────────────────

function InstrumentCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-sky-200/70 bg-white/90 shadow dark:border-slate-800/50 dark:bg-[#111520]">
      <div className="flex items-center justify-between border-b border-sky-200/70 px-4 py-2.5 dark:border-slate-800/50">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex flex-col gap-2.5 px-4 py-3">
        <div className="space-y-1"><Skeleton className="h-2 w-24" /><Skeleton className="h-3 w-full" /></div>
        <div className="space-y-1"><Skeleton className="h-2 w-24" /><Skeleton className="h-3 w-full" /></div>
      </div>
      <div className="flex justify-between border-t border-sky-200/70 px-4 py-2 dark:border-slate-800/40">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IngestionProgressPage() {
  const { data, isLoading, isError, dataUpdatedAt, isFetching } = useRealtimeQuery('progress', {
    queryKey: ['progress'],
    queryFn: api.progress.list,
  })

  const totalTickConfirmed   = data?.reduce((a, d) => a + d.tickConfirmed,    0) ?? 0
  const totalTickExpected    = data?.reduce((a, d) => a + d.expectedTickHours, 0) ?? 0
  const totalCandleConfirmed = data?.reduce((a, d) => a + d.candleConfirmed,  0) ?? 0
  const totalCandleExpected  = data?.reduce((a, d) => a + d.expectedCandleDays, 0) ?? 0
  const avgTick   = totalTickExpected   > 0 ? Math.round((totalTickConfirmed   / totalTickExpected)   * 100) : 0
  const avgCandle = totalCandleExpected > 0 ? Math.round((totalCandleConfirmed / totalCandleExpected) * 100) : 0
  const fullyDone = data?.filter(d => d.tickProgress >= 100 && d.candleProgress >= 100).length ?? 0
  const total     = data?.length ?? 0

  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null

  // Column sizing: auto-fit so cards fill available space naturally.
  // minmax(300px, 1fr) → at 1920px (≈1340px usable): 4 cols
  //                    → at 1366px (≈1174px usable): 3 cols
  // With 64 instruments at 4 cols = 16 rows × ~130px ≈ 2080px scroll
  const gridStyle = { gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-4">

      {/* ── Header: updated timestamp + active locks ──────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          {isFetching && <RefreshCw size={11} className="animate-spin text-slate-500" />}
          {updatedAt && !isFetching && <span>Updated {updatedAt}</span>}
          {total > 0 && (
            <span className="rounded border border-sky-200/70 bg-white/80 px-2 py-0.5 font-mono font-semibold text-slate-600 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-400">
              {total} symbol{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <ActiveLocks />
      </div>

      {/* ── Summary KPIs ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-3">
        {isLoading ? (
          [0, 1, 2].map(i => (
            <div key={i} className="space-y-2.5 rounded-xl border border-sky-200/70 bg-white/90 p-4 shadow dark:border-slate-800/50 dark:bg-[#111520]">
              <div className="flex justify-between"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-8" /></div>
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))
        ) : (
          <>
            <SummaryKpi
              label="Tick Ingestion" confirmed={totalTickConfirmed} total={totalTickExpected} pct={avgTick}
              icon={TrendingUp} barColor="bg-gradient-to-r from-sky-600 to-sky-400" iconColor="text-sky-400 bg-sky-500/10"
            />
            <SummaryKpi
              label="Candle Aggregation" confirmed={totalCandleConfirmed} total={totalCandleExpected} pct={avgCandle}
              icon={BarChart2} barColor="bg-gradient-to-r from-pink-600 to-pink-400" iconColor="text-pink-400 bg-pink-500/10"
            />
            <SummaryKpi
              label="Fully Synced" confirmed={fullyDone} total={total}
              pct={total > 0 ? Math.round((fullyDone / total) * 100) : 0}
              icon={CheckCircle2} barColor="bg-gradient-to-r from-emerald-600 to-emerald-400" iconColor="text-emerald-400 bg-emerald-500/10"
            />
          </>
        )}
      </div>

      {/* ── Instrument grid — scrollable, responsive columns ─────── */}
      <div className="flex-1 min-h-0 overflow-auto pr-0.5">
        {isLoading && (
          <div className="grid gap-3" style={gridStyle}>
            {Array.from({ length: 8 }).map((_, i) => <InstrumentCardSkeleton key={i} />)}
          </div>
        )}
        {isError && (
          <EmptyState title="Sync check failed" message="An error occurred while computing progress status." icon={RefreshCw} />
        )}
        {!isLoading && !isError && data?.length === 0 && (
          <EmptyState title="No active pipelines" message="Enable some currency symbols to begin progress synchronization." />
        )}
        {data && data.length > 0 && (
          <div className="grid gap-3 pb-2" style={gridStyle}>
            {data.map(entry => (
              <InstrumentCard key={entry.instrumentId} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
