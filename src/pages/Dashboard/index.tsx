import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileArchive,
  HardDrive,
  MemoryStick,
  PackageCheck,
  PauseCircle,
  Radio,
  RefreshCw,
  Send,
  Wifi,
  Workflow,
  XCircle,
  Zap,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { KpiCardSkeleton, TableSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActiveLocks } from '@/components/ui/ActiveLocks'
import { api } from '@/lib/api'
import type { ActivityEntry, HeatmapEntry, InstrumentStorage, KpiStats, ProgressEntry, QueueInfo, RuntimeStats, StateStatus, StorageStats } from '@/types'
import { STATUS_CLASSES } from '@/lib/constants'
import { clsx } from 'clsx'

// ─── Queue Health ─────────────────────────────────────────────────────────────

const QUEUE_LABELS: Record<string, string> = {
  'jobs.ticks.regular':    'Ticks Regular',
  'jobs.ticks.backfill':   'Ticks Backfill',
  'jobs.candles.regular':  'Candles Regular',
  'jobs.candles.backfill': 'Candles Backfill',
  'jobs.maintenance':      'Maintenance',
  'jobs.sync':             'Sync',
}

function QueueHealthPanel({ queues }: { queues: QueueInfo[] }) {
  return (
    <div className="space-y-2">
      {/* 2-column compact grid */}
      <div className="grid grid-cols-2 gap-1">
        {queues.map((q) => {
          const label = QUEUE_LABELS[q.name] ?? q.name
          const ok = q.consumers > 0
          const unreachable = q.consumers === -1

          return (
            <div
              key={q.name}
              className={clsx(
                'flex items-center justify-between rounded border px-2 py-1',
                ok
                  ? 'border-sky-200/70 bg-white/75 dark:border-slate-800/40 dark:bg-[#040E1C]/30'
                  : unreachable
                  ? 'border-slate-200 bg-slate-100/60 dark:border-slate-700/40 dark:bg-slate-800/10'
                  : 'border-rose-300/50 bg-rose-50/80 dark:border-rose-500/20 dark:bg-rose-500/5'
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={clsx(
                  'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                  unreachable ? 'bg-slate-500' : ok ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-pulse'
                )} />
                <span className="text-[10px] font-mono text-slate-400 truncate">{label}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                {!unreachable && q.messages > 0 && (
                  <span className="rounded bg-amber-500/10 px-1 text-[9px] font-bold text-amber-400">
                    {q.messages}
                  </span>
                )}
                <span className={clsx(
                  'text-[10px] font-bold font-mono',
                  unreachable ? 'text-slate-600' : ok ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {unreachable ? '?' : `${q.consumers}c`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Shared refresh button ───────────────────────────────────────────────────
function RefreshBtn({ onClick, spinning = false }: { onClick: () => void; spinning?: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Refresh"
      className="flex items-center justify-center h-5 w-5 rounded text-slate-400 hover:text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
    >
      <RefreshCw size={10} className={clsx(spinning && 'animate-spin')} />
    </button>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  onRefresh,
  spinning,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  sub?: string
  onRefresh?: () => void
  spinning?: boolean
}) {
  return (
    <div className="glow-card relative flex items-center gap-3 rounded-xl border border-sky-200/70 bg-white/90 px-3 py-2.5 shadow-md transition-all duration-300 dark:border-sky-900/30 dark:bg-[#111520]">
      {onRefresh && (
        <div className="absolute top-1.5 right-1.5">
          <RefreshBtn onClick={onRefresh} spinning={spinning} />
        </div>
      )}
      <div className={clsx('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-white/5 shadow-inner', color)}>
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 pr-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold leading-none tabular-nums text-sky-900 dark:text-slate-100">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {sub && <p className="text-[11px] font-medium text-slate-600 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Storage integrity badge ──────────────────────────────────────────────────
// Compares DB CONFIRMED count with actual parquet file count in R2.
// ✓  = match (green)     — every CONFIRMED row has its file
// ↓N = DB > R2  (red)    — N files missing in object storage
// ↑N = R2 > DB  (amber)  — N orphan files in object storage
function StorageIntegrityBadge({ dbCount, r2Count }: { dbCount: number; r2Count: number }) {
  const delta = dbCount - r2Count

  const fmt = (n: number) =>
    n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n)

  if (delta === 0) {
    return (
      <span
        title={`DB CONFIRMED = R2 files (${dbCount.toLocaleString()})`}
        className="inline-flex flex-shrink-0 items-center gap-0.5 rounded border border-emerald-500/25 bg-emerald-500/10 px-1 py-0.5 font-mono text-[8px] font-bold text-emerald-400"
      >
        <PackageCheck size={7} strokeWidth={2.5} />
        <span>✓</span>
      </span>
    )
  }

  if (delta > 0) {
    // DB has more CONFIRMED rows than R2 files → files missing
    return (
      <span
        title={`${delta.toLocaleString()} parquet files missing in R2 (DB: ${dbCount.toLocaleString()} · R2: ${r2Count.toLocaleString()})`}
        className="inline-flex flex-shrink-0 items-center gap-0.5 rounded border border-rose-500/30 bg-rose-500/10 px-1 py-0.5 font-mono text-[8px] font-bold text-rose-400"
      >
        <span>↓{fmt(delta)}</span>
      </span>
    )
  }

  // R2 has more files than DB CONFIRMED → orphan files
  return (
    <span
      title={`${Math.abs(delta).toLocaleString()} orphan files in R2 (DB: ${dbCount.toLocaleString()} · R2: ${r2Count.toLocaleString()})`}
      className="inline-flex flex-shrink-0 items-center gap-0.5 rounded border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 font-mono text-[8px] font-bold text-amber-400"
    >
      <span>↑{fmt(Math.abs(delta))}</span>
    </span>
  )
}

// ─── Heatmap cell — single inline row: pill + count + integrity + bar + % ────
function HeatmapCell({
  status,
  count,
  storageCount,
  progress,
  progressColor,
  pctColor,
}: {
  status: StateStatus | null
  count?: number
  storageCount?: number
  progress?: number
  progressColor: string
  pctColor: string
}) {
  if (!status) {
    return (
      <div className="flex h-5 items-center justify-center rounded border border-slate-200/60 bg-slate-100/50 text-[9px] text-slate-500 dark:border-sky-900/30 dark:bg-[#040E1C]/30">
        —
      </div>
    )
  }

  const classes = STATUS_CLASSES[status] ?? {
    badge:  'bg-slate-500/10 text-slate-400 dark:text-slate-500 border-slate-500/20',
    text:   'text-slate-400 dark:text-slate-500',
    bg:     'bg-slate-500',
    border: 'border-slate-500/20',
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {/* Compact status pill */}
      <div className={clsx(
        'inline-flex flex-shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold',
        classes.badge
      )}>
        <span className={clsx('h-1.5 w-1.5 flex-shrink-0 rounded-full', classes.bg)} />
        {status}
      </div>

      {/* CONFIRMED count */}
      {count !== undefined && (
        <span className={clsx('flex-shrink-0 font-mono text-[10px] font-bold tabular-nums', classes.text)}>
          {count.toLocaleString()}
        </span>
      )}

      {/* Storage integrity badge — DB CONFIRMED vs R2 parquet file count */}
      {count !== undefined && storageCount !== undefined && (
        <StorageIntegrityBadge dbCount={count} r2Count={storageCount} />
      )}

      {/* Inline progress bar + percentage — same row, no second line */}
      {progress !== undefined && (
        <>
          <div className="min-w-0 flex-1 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/60">
            <div
              className={clsx('h-full rounded-full transition-all duration-700', progressColor)}
              style={{ width: `${progress}%`, minWidth: progress > 0 ? '2px' : '0' }}
            />
          </div>
          <span className={clsx('flex-shrink-0 font-mono text-[9px] font-bold tabular-nums', pctColor)}>
            {progress}%
          </span>
        </>
      )}
    </div>
  )
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────
function Heatmap({
  data,
  progressMap,
  storageMap,
}: {
  data: HeatmapEntry[]
  progressMap: Map<string, ProgressEntry>
  storageMap: Map<string, InstrumentStorage>
}) {
  if (data.length === 0) {
    return <EmptyState title="Heatmap empty" message="No currency instruments registered." />
  }

  return (
    <div className="w-full h-full overflow-auto pr-1">
      {/* Header */}
      <div
        className="sticky top-0 z-10 mb-1.5 grid h-7 items-center gap-2.5 rounded-md border border-sky-200/70 bg-sky-50/95 px-2 backdrop-blur dark:border-sky-900/30 dark:bg-[#040E1C]/80"
        style={{ gridTemplateColumns: '120px 1fr 1fr' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Symbol</div>
        <div className="text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">TICK Ingestion</div>
        <div className="text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">CANDLE Ingestion</div>
      </div>

      <div className="space-y-0.5">
        {data.map((entry) => {
          const prog = progressMap.get(entry.instrumentId)
          // Storage stats are indexed by instrument name (lowercase, matches R2 path segment)
          const r2 = storageMap.get(entry.instrumentName.toLowerCase())

          return (
            <div
              key={entry.instrumentId}
              className="interactive-element group -mx-2 grid items-center gap-2.5 rounded px-2 py-1 transition-all duration-150 hover:bg-sky-50/80 dark:hover:bg-sky-900/20"
              style={{ gridTemplateColumns: '120px 1fr 1fr' }}
            >
              {/* Symbol name */}
              <div className="flex items-center gap-1.5 min-w-0">
                {entry.isPause ? (
                  <PauseCircle size={11} className="flex-shrink-0 text-amber-500 animate-pulse" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80 shadow shadow-emerald-500/50 flex-shrink-0" />
                )}
                <span className="truncate font-mono text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-sky-400 group-hover:text-sky-600 transition-colors">
                  {entry.instrumentName}
                </span>
              </div>

              {/* TICK — status pill + count + integrity badge + bar + % */}
              <HeatmapCell
                status={entry.tickStatus}
                count={entry.tickConfirmed}
                storageCount={r2?.tick_files}
                progress={prog?.tickProgress}
                progressColor="bg-sky-500"
                pctColor="text-sky-400"
              />

              {/* CANDLE — status pill + count + integrity badge + bar + % */}
              <HeatmapCell
                status={entry.candleStatus}
                count={entry.candleConfirmed}
                storageCount={r2?.candle_files}
                progress={prog?.candleProgress}
                progressColor="bg-pink-500"
                pctColor="text-pink-400"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Pipeline Progress per-instrument belongs on the dedicated /progress page,
// not in the Dashboard sidebar — it grows with 64+ instruments.

// ─── Quick Actions panel — supports both MQ and REST trigger methods ──────────

const ACTION_CONFIG: {
  workerKey: string
  actionKey: string
  label: string
  icon: React.ElementType
  iconCls: string
  labelCls: string
  borderCls: string
  hoverCls: string
  dotCls: string
}[] = [
  { workerKey: 'maintenance',     actionKey: 'maintenance',     label: 'Maintenance',      icon: Database,
    iconCls: 'text-orange-400',  labelCls: 'text-orange-500 dark:text-orange-400',  borderCls: 'border-orange-200/70 dark:border-orange-500/20',  hoverCls: 'hover:bg-orange-500/5',  dotCls: 'bg-orange-400'  },
  { workerKey: 'sync',            actionKey: 'sync',            label: 'Outbox Sync',      icon: RefreshCw,
    iconCls: 'text-teal-400',    labelCls: 'text-teal-500 dark:text-teal-400',    borderCls: 'border-teal-200/70 dark:border-teal-500/20',    hoverCls: 'hover:bg-teal-500/5',    dotCls: 'bg-teal-400'    },
  { workerKey: 'ticks/regular',   actionKey: 'ticks/regular',   label: 'Ticks Regular',    icon: Zap,
    iconCls: 'text-sky-400',     labelCls: 'text-sky-500 dark:text-sky-400',     borderCls: 'border-sky-200/70 dark:border-sky-500/20',     hoverCls: 'hover:bg-sky-500/5',     dotCls: 'bg-sky-400'     },
  { workerKey: 'ticks/backfill',  actionKey: 'ticks/backfill',  label: 'Ticks Backfill',   icon: Activity,
    iconCls: 'text-indigo-400',  labelCls: 'text-indigo-500 dark:text-indigo-400',  borderCls: 'border-indigo-200/70 dark:border-indigo-500/20',  hoverCls: 'hover:bg-indigo-500/5',  dotCls: 'bg-indigo-400'  },
  { workerKey: 'candles/regular', actionKey: 'candles/regular', label: 'Candles Regular',  icon: BarChart3,
    iconCls: 'text-emerald-400', labelCls: 'text-emerald-500 dark:text-emerald-400', borderCls: 'border-emerald-200/70 dark:border-emerald-500/20', hoverCls: 'hover:bg-emerald-500/5', dotCls: 'bg-emerald-400' },
  { workerKey: 'candles/backfill',actionKey: 'candles/backfill',label: 'Candles Backfill', icon: CheckCircle2,
    iconCls: 'text-rose-400',    labelCls: 'text-rose-500 dark:text-rose-400',    borderCls: 'border-rose-200/70 dark:border-rose-500/20',    hoverCls: 'hover:bg-rose-500/5',    dotCls: 'bg-rose-400'    },
]

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const total = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s ago`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s ago`
  return `${s}s ago`
}

function nextRunIn(iso: string | null): string {
  if (!iso) return '—'
  const total = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000))
  if (total === 0) return 'soon'
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

type FbState = Record<string, 'ok' | 'err' | 'loading'>

function QuickActionsPanel() {
  const qc = useQueryClient()
  const [fb, setFb] = useState<FbState>({})
  const [, setTick] = useState(0)

  // Re-render every second so relativeTime() and nextRunIn() stay accurate.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const { data: crons } = useRealtimeQuery('crons', {
    queryKey: ['crons'],
    queryFn: api.crons.list,
  })

  function mark(key: string, state: 'ok' | 'err') {
    setFb(p => ({ ...p, [key]: state }))
    setTimeout(() => setFb(p => { const n = { ...p }; delete n[key]; return n }), 2500)
  }

  // MQ: publish to queue via cron scheduler
  const triggerMQ = useMutation({
    mutationFn: (cronId: string) => api.crons.trigger(cronId),
    onMutate:   (id) => { const wk = crons?.find(c => c.id === id)?.workerKey ?? ''; setFb(p => ({ ...p, [`${wk}:mq`]: 'loading' })) },
    onSuccess:  (_, id) => { const wk = crons?.find(c => c.id === id)?.workerKey ?? ''; setFb(p => { const n={...p}; delete n[`${wk}:mq`]; return n }); mark(`${wk}:mq`, 'ok'); qc.invalidateQueries({ queryKey: ['crons'] }) },
    onError:    (_, id) => { const wk = crons?.find(c => c.id === id)?.workerKey ?? ''; setFb(p => { const n={...p}; delete n[`${wk}:mq`]; return n }); mark(`${wk}:mq`, 'err') },
  })

  // REST: direct HTTP POST to Go daemon
  const triggerREST = useMutation({
    mutationFn: (actionKey: string) => api.control.trigger(actionKey),
    onMutate:   (key) => setFb(p => ({ ...p, [`${key}:rest`]: 'loading' })),
    onSuccess:  (_, key) => { setFb(p => { const n={...p}; delete n[`${key}:rest`]; return n }); mark(`${key}:rest`, 'ok') },
    onError:    (_, key) => { setFb(p => { const n={...p}; delete n[`${key}:rest`]; return n }); mark(`${key}:rest`, 'err') },
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Column legend */}
      <div className="flex flex-shrink-0 items-center justify-end gap-3 border-b border-sky-200/70 pb-1 dark:border-slate-800/50">
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-purple-400/70">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 inline-block" /> MQ
        </span>
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-blue-400/70">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" /> REST
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-auto pt-1 pr-1">
      {ACTION_CONFIG.map(({ workerKey, actionKey, label, icon: Icon, iconCls, labelCls, borderCls, hoverCls, dotCls }) => {
        const cron    = crons?.find(c => c.workerKey === workerKey)
        const mqKey   = `${workerKey}:mq`
        const restKey = `${actionKey}:rest`
        const mqSt    = fb[mqKey]
        const restSt  = fb[restKey]

        // Icon-only trigger button — label already described in the legend at top
        const TriggerBtn = ({
          state, title: btnTitle, onPress, loadingClass, defaultClass,
        }: {
          state: 'ok'|'err'|'loading'|undefined
          title: string; onPress: () => void
          loadingClass: string; defaultClass: string
        }) => (
          <button
            disabled={state === 'loading'}
            onClick={onPress}
            title={btnTitle}
            className={clsx(
              'flex items-center justify-center w-5 h-5 rounded border transition-all flex-shrink-0',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              state === 'ok'      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' :
              state === 'err'     ? 'border-rose-500/40 bg-rose-500/10 text-rose-400' :
              state === 'loading' ? loadingClass :
              defaultClass
            )}
          >
            {state === 'loading' ? <RefreshCw size={9} className="animate-spin" /> :
             state === 'ok'      ? <CheckCircle2 size={9} /> :
             state === 'err'     ? <XCircle size={9} /> :
             <Send size={9} />}
          </button>
        )

        return (
          <div
            key={workerKey}
            className={clsx(
              'flex items-center gap-1.5 rounded border px-1.5 py-0.5 transition-colors',
              'bg-white/75 dark:bg-[#040E1C]/30 shadow-sm dark:shadow-none',
              borderCls, hoverCls
            )}
          >
            <span className={clsx('h-1.5 w-1.5 flex-shrink-0 rounded-full', dotCls)} />
            <Icon size={10} className={clsx('flex-shrink-0', iconCls)} />
            <span className={clsx('min-w-0 flex-1 truncate text-[10px] font-semibold', labelCls)}>{label}</span>
            <div className="flex flex-shrink-0 flex-col items-end">
              <span className="font-mono text-[9px] tabular-nums text-slate-500 dark:text-slate-600 leading-tight">
                {relativeTime(cron?.lastTriggeredAt ?? null)}
              </span>
              <span className="font-mono text-[9px] tabular-nums leading-tight text-sky-500 dark:text-sky-400/80">
                ↻ {nextRunIn(cron?.nextRunAt ?? null)}
              </span>
            </div>

            {/* MQ button */}
            <TriggerBtn
              state={mqSt}
              title={`Trigger ${label} via RabbitMQ`}
              onPress={() => cron && triggerMQ.mutate(cron.id)}
              loadingClass="border-purple-500/30 bg-purple-500/10 text-purple-400"
              defaultClass="border-purple-500/25 bg-purple-500/5 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50"
            />

            {/* REST button */}
            <TriggerBtn
              state={restSt}
              title={`Trigger ${label} via REST (HTTP → Go Daemon)`}
              onPress={() => triggerREST.mutate(actionKey)}
              loadingClass="border-blue-500/30 bg-blue-500/10 text-blue-400"
              defaultClass="border-blue-500/25 bg-blue-500/5 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50"
            />
          </div>
        )
      })}
      </div>
    </div>
  )
}


// ─── Last Notifications ───────────────────────────────────────────────────────

const _notifBase = Date.now()
const SAMPLE_NOTIFICATIONS = [
  { id: 1, type: 'success' as const, message: 'Ticks Backfill completed — 0 PENDING remaining',         ts: _notifBase - 1 * 60_000 },
  { id: 2, type: 'warning' as const, message: '422 states ABANDONED after reaching max retries (5)',     ts: _notifBase - 3 * 60_000 },
  { id: 3, type: 'info'    as const, message: 'Gap fill detected stuck rows → IsPause=true for xauusd', ts: _notifBase - 8 * 60_000 },
]

function LastNotifications() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-0.5">
      {SAMPLE_NOTIFICATIONS.map((n) => (
        <div key={n.id} className="flex items-center gap-2 rounded px-2 py-0.5 hover:bg-slate-50 dark:hover:bg-sky-900/10 transition-colors">
          <span className={clsx(
            'h-1.5 w-1.5 flex-shrink-0 rounded-full',
            n.type === 'success' ? 'bg-emerald-400' :
            n.type === 'warning' ? 'bg-amber-400' :
            n.type === 'info'    ? 'bg-sky-400' :
                                   'bg-rose-400'
          )} />
          <span className="min-w-0 flex-1 text-[10px] leading-snug text-slate-500 dark:text-slate-400 truncate">{n.message}</span>
          <span className="flex-shrink-0 font-mono text-[9px] text-slate-400 dark:text-slate-600">{relativeTime(new Date(n.ts).toISOString())}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const qc       = useQueryClient()
  const kpis     = useRealtimeQuery('kpis',         { queryKey: ['dashboard', 'kpis'],     queryFn: api.dashboard.kpis })
  const heatmap  = useRealtimeQuery('heatmap',      { queryKey: ['dashboard', 'heatmap'],  queryFn: api.dashboard.heatmap })
  const queues   = useRealtimeQuery('queues',        { queryKey: ['control', 'queues'],     queryFn: api.control.queues })
  const runtime  = useRealtimeQuery('runtime',       { queryKey: ['control', 'runtime'],    queryFn: api.control.runtime,  retry: 1 })
  const storage  = useQuery({ queryKey: ['control', 'storage'],   queryFn: api.control.storage,   refetchInterval: 300_000, retry: 1 })
  const activity = useRealtimeQuery('activity',     { queryKey: ['dashboard', 'activity'], queryFn: () => api.dashboard.activity(5) })
  const progress = useRealtimeQuery('progress',     { queryKey: ['progress'],              queryFn: api.progress.list })

  const refetchKpis    = () => qc.invalidateQueries({ queryKey: ['dashboard', 'kpis'] })
  const refetchHeatmap = () => { qc.invalidateQueries({ queryKey: ['dashboard', 'heatmap'] }); qc.invalidateQueries({ queryKey: ['dashboard', 'activity'] }) }
  const refetchQueues  = () => qc.invalidateQueries({ queryKey: ['control', 'queues'] })
  const refetchRuntime = () => qc.invalidateQueries({ queryKey: ['control', 'runtime'] })
  const refetchStorage = () => qc.invalidateQueries({ queryKey: ['control', 'storage'] })
  const refetchSystem  = () => { refetchKpis(); refetchStorage(); refetchRuntime() }
  const refetchCrons   = () => qc.invalidateQueries({ queryKey: ['crons'] })

  // Build a lookup map for the heatmap to join with progress data
  const progressMap = new Map<string, ProgressEntry>(
    (progress.data ?? []).map(p => [p.instrumentId, p])
  )

  // Build a lookup map for storage integrity check: instrument name (lowercase) → R2 file counts
  const storageMap = new Map<string, InstrumentStorage>(
    (storage.data?.instruments ?? []).map(s => [s.name.toLowerCase(), s])
  )

  const k: KpiStats = kpis.data ?? {
    totalInstruments: 0, activeInstruments: 0, pausedInstruments: 0,
    confirmedStates: 0, completedStates: 0, failedStates: 0, abandonedStates: 0,
    brokenStates: 0, pendingStates: 0, processedStates: 0, notFoundStates: 0, totalStates: 0,
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-2">
      {/* ── KPI row + Active Locks header ────────────────────────────────── */}
      <div className="flex-shrink-0 flex flex-col gap-1.5">
        {/* Active Locks — only renders when a worker is holding an advisory lock */}
        <div className="flex justify-end">
          <ActiveLocks />
        </div>
        <div className="grid grid-cols-4 gap-2">
        {kpis.isLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Pipeline Instruments"
              value={k.totalInstruments}
              icon={BarChart3}
              color="bg-sky-600/10 text-sky-600 dark:text-sky-400 border border-sky-500/10"
              sub={`${k.activeInstruments} active symbols · ${k.pausedInstruments} paused`}
              onRefresh={refetchKpis} spinning={kpis.isFetching}
            />
            <KpiCard
              label="Confirmed Operations"
              value={k.confirmedStates}
              icon={CheckCircle2}
              color="bg-emerald-600/10 text-emerald-400 border border-emerald-500/10"
              sub={`${k.completedStates.toLocaleString()} completed tasks`}
              onRefresh={refetchKpis} spinning={kpis.isFetching}
            />
            <KpiCard
              label="Pending & In-Flight"
              value={k.pendingStates + k.processedStates}
              icon={RefreshCw}
              color="bg-blue-600/10 text-blue-400 border border-blue-500/10"
              sub={`${k.notFoundStates.toLocaleString()} items not found`}
              onRefresh={refetchKpis} spinning={kpis.isFetching}
            />
            <KpiCard
              label="Failed / Attention Required"
              value={k.failedStates + k.abandonedStates + k.brokenStates}
              icon={AlertTriangle}
              color="bg-rose-600/10 text-rose-400 border border-rose-500/10"
              sub={`${k.brokenStates} broken · ${k.abandonedStates} abandoned`}
              onRefresh={refetchKpis} spinning={kpis.isFetching}
            />
          </>
        )}
        </div>{/* end grid */}
      </div>{/* end KPI + locks wrapper */}

      {/* ── Content row ───────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-2">
        {/* Heatmap + Recent Activity — takes left portion */}
        <Card
          title="Pipeline Ingestion Heatmap"
          subtitle="Dominant state per job type · TICK confirmed counts shown"
          className="flex min-w-0 flex-1 flex-col border-sky-200/70 bg-white/90 dark:border-sky-900/30 dark:bg-[#111520]"
          noPadding
          bodyClassName="flex min-h-0 flex-1 flex-col"
          action={<RefreshBtn onClick={refetchHeatmap} spinning={heatmap.isFetching || activity.isFetching} />}
        >
          {/* Top: heatmap — grows to fill remaining space */}
          <div className="min-h-0 flex-1 overflow-auto p-2.5">
            {heatmap.isLoading && <TableSkeleton cols={3} rows={8} />}
            {heatmap.isError && <EmptyState title="Heatmap load failed" message="An error occurred while compiling pipeline statuses." icon={Workflow} />}
            {heatmap.data && <Heatmap data={heatmap.data} progressMap={progressMap} storageMap={storageMap} />}
          </div>

          {/* Bottom: recent activity — fixed height, pinned */}
          <div className="h-[155px] flex-shrink-0">
            <RecentActivity entries={activity.data} isLoading={activity.isLoading} />
          </div>
        </Card>

        {/* ── Right panel: dua flex column mandiri ────────────────────────── */}
        {/* Setiap kolom mengelola tingginya sendiri sehingga tidak ada       */}
        {/* ketergantungan antar row yang menyebabkan jarak aneh.             */}
        <div className="flex min-h-0 min-w-0 flex-1 gap-2">

          {/* Kolom kiri: System Health + Worker Queue */}
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <Card
              title="System Health Status"
              className="flex-shrink-0 border-sky-200/70 bg-white/90 dark:border-sky-900/30 dark:bg-[#111520]"
              action={<RefreshBtn onClick={refetchSystem} spinning={kpis.isFetching || storage.isFetching || runtime.isFetching} />}
            >
              {kpis.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  <SystemHealth totalStates={k.totalStates} kpis={k} />
                  <StoragePanel data={storage.data} />
                  <ResourcePanel data={runtime.data} />
                </>
              )}
            </Card>

            <Card
              title="Worker Queue Health"
              subtitle={queues.data ? `${queues.data.healthy}/${queues.data.total} consuming` : 'Checking…'}
              action={<RefreshBtn onClick={refetchQueues} spinning={queues.isFetching} />}
              className="min-h-0 flex-1 border-sky-200/70 bg-white/90 dark:border-sky-900/30 dark:bg-[#111520]"
            >
              {queues.isLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                </div>
              )}
              {queues.isError && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5">
                  <XCircle size={12} /> Unreachable
                </p>
              )}
              {queues.data && (
                <QueueHealthPanel queues={queues.data.queues} />
              )}
            </Card>
          </div>

          {/* Kolom kanan: Quick Actions + DB State (flex-1) + Last Notification */}
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <Card
              title="Quick Actions"
              className="flex-shrink-0 border-sky-200/70 bg-white/90 dark:border-sky-900/30 dark:bg-[#111520]"
              noPadding
              bodyClassName="overflow-auto p-2"
              action={<RefreshBtn onClick={refetchCrons} />}
            >
              <QuickActionsPanel />
            </Card>

            <Card
              title="Database State Breakdown"
              className="min-h-0 flex-1 border-sky-200/70 bg-white/90 dark:border-sky-900/30 dark:bg-[#111520]"
              noPadding
              bodyClassName="overflow-auto p-2.5"
              action={<RefreshBtn onClick={refetchKpis} spinning={kpis.isFetching} />}
            >
              {kpis.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-0.5">
                      <Skeleton className="h-2.5 w-14" />
                      <Skeleton className="h-1.5 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <StateBreakdown kpis={k} />
              )}
            </Card>

            <Card
              title="Last Notification"
              className="flex-shrink-0 border-sky-200/70 bg-white/90 dark:border-sky-900/30 dark:bg-[#111520]"
              noPadding
              bodyClassName="p-1.5"
              action={<RefreshBtn onClick={() => qc.invalidateQueries({ queryKey: ['dashboard', 'activity'] })} spinning={activity.isFetching} />}
            >
              <LastNotifications />
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── Storage Panel ───────────────────────────────────────────────────────────

function fmtBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  if (mb >= 1)    return `${mb.toFixed(1)} MB`
  return `${(mb * 1024).toFixed(0)} KB`
}

function StoragePanel({ data }: { data: StorageStats | undefined }) {
  if (!data) {
    return (
      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-sky-900/30">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Object Storage</p>
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  const tickPct   = data.total_bytes > 0 ? Math.round((data.tick_files   / data.total_files) * 100) : 0
  const candlePct = 100 - tickPct

  return (
    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-sky-900/30">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Object Storage</p>

      {/* Total + bar in one row */}
      <div className="flex items-center justify-between rounded-md border border-sky-200/60 bg-sky-50/50 px-2.5 py-1.5 dark:border-sky-900/30 dark:bg-[#040E1C]/40">
        <div className="flex items-center gap-1.5">
          <HardDrive size={11} className="text-sky-400" />
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Total Used</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-sky-500 dark:text-sky-400">{fmtBytes(data.total_mb)}</span>
      </div>

      {/* Tick vs Candle split bar */}
      <div className="flex h-1.5 overflow-hidden rounded-full">
        <div className="bg-sky-500 h-full" style={{ width: `${tickPct}%` }} />
        <div className="bg-pink-500 h-full" style={{ width: `${candlePct}%` }} />
      </div>

      {/* Counts row */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[9px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 flex-shrink-0" />
          {data.tick_files.toLocaleString()} ticks
        </span>
        <span className="flex items-center gap-1 text-[9px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-400 flex-shrink-0" />
          {data.candle_files.toLocaleString()} candles
        </span>
        <span className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
          <FileArchive size={9} />
          {data.total_files.toLocaleString()} files
        </span>
      </div>
    </div>
  )
}

// ─── Resource Panel ──────────────────────────────────────────────────────────
// Compact CPU + memory gauges appended inside the System Health card.

function ResourceBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/60">
      <div
        className={clsx('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${clamped}%`, minWidth: clamped > 0 ? '3px' : 0 }}
      />
    </div>
  )
}

function ResourcePanel({ data }: { data: RuntimeStats | undefined }) {
  if (!data) {
    return (
      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-sky-900/30">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Ingestion Process</p>
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  const cpuReady  = data.cpu_percent >= 0
  const cpuPct    = cpuReady ? data.cpu_percent : 0
  const cpuColor  = cpuPct > 80 ? 'bg-rose-500' : cpuPct > 50 ? 'bg-amber-400' : 'bg-sky-500'

  const heapPct   = data.sys_mb > 0 ? (data.heap_alloc_mb / data.sys_mb) * 100 : 0
  const heapColor = heapPct > 85 ? 'bg-rose-500' : heapPct > 65 ? 'bg-amber-400' : 'bg-emerald-500'

  const uptimeFmt = (() => {
    const s = data.uptime_seconds
    if (s < 60)   return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  })()

  return (
    <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3 dark:border-sky-900/30">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Ingestion Process</p>

      {/* CPU */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu size={11} className="text-sky-400" />
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">CPU Usage</span>
          </div>
          <span className={clsx('font-mono text-[10px] font-bold tabular-nums', cpuPct > 80 ? 'text-rose-400' : cpuPct > 50 ? 'text-amber-400' : 'text-sky-400')}>
            {cpuReady ? `${cpuPct.toFixed(1)}%` : '—'}
          </span>
        </div>
        <ResourceBar pct={cpuPct} color={cpuColor} />
        <p className="mt-0.5 text-right text-[9px] text-slate-400 dark:text-slate-600">
          {data.num_cpu} logical CPU{data.num_cpu !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Heap Memory */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MemoryStick size={11} className="text-emerald-400" />
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Heap Memory</span>
          </div>
          <span className={clsx('font-mono text-[10px] font-bold tabular-nums', heapPct > 85 ? 'text-rose-400' : heapPct > 65 ? 'text-amber-400' : 'text-emerald-400')}>
            {data.heap_alloc_mb.toFixed(1)} / {data.sys_mb.toFixed(0)} MB
          </span>
        </div>
        <ResourceBar pct={heapPct} color={heapColor} />
        <p className="mt-0.5 text-right text-[9px] text-slate-400 dark:text-slate-600">
          {data.heap_inuse_mb.toFixed(1)} MB in-use · {data.gc_cycles} GC cycles
        </p>
      </div>

      {/* Goroutines + Uptime row */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 dark:border-sky-900/20">
        <span className="flex items-center gap-1 text-[9px] font-medium text-slate-400">
          <Activity size={9} />
          {data.num_goroutine} goroutines
        </span>
        <span className="text-[9px] font-mono text-slate-400">
          up {uptimeFmt}
        </span>
      </div>
    </div>
  )
}

// ─── Recent Activity ─────────────────────────────────────────────────────────

const JOB_LABELS: Record<string, string> = {
  'ticks.regular':    'Ticks Regular',
  'ticks.backfill':   'Ticks Backfill',
  'candles.regular':  'Candles Regular',
  'candles.backfill': 'Candles Backfill',
  'maintenance':      'Maintenance',
  'sync':             'Sync',
}

// Jobs still "running" (finished_at IS NULL) after this long are stale — the
// ingestion process was killed without writing a completion record.
const STALE_RUNNING_MS = 5 * 60 * 1_000 // 5 minutes

function durationLabel(ms: number | null, finishedAt: string | null): { text: string; color: string } {
  if (ms === null && finishedAt === null) return { text: 'running…', color: 'text-sky-400 animate-pulse' }
  if (ms === null) return { text: '—', color: 'text-slate-400' }
  if (ms < 1_000)  return { text: `${ms}ms`,                         color: 'text-emerald-400' }
  if (ms < 5_000)  return { text: `${(ms / 1000).toFixed(1)}s`,      color: 'text-emerald-400' }
  if (ms < 30_000) return { text: `${(ms / 1000).toFixed(1)}s`,      color: 'text-amber-400' }
  return               { text: `${(ms / 1000).toFixed(0)}s`,          color: 'text-rose-400' }
}

function timeAgo(iso: string): string {
  const total = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s ago`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s ago`
  return `${s}s ago`
}

function RecentActivity({ entries, isLoading }: { entries: ActivityEntry[] | undefined; isLoading: boolean }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex min-h-0 flex-col border-t border-sky-200/70 dark:border-slate-800/50">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-3.5 pb-1.5 pt-2.5">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent Activity</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" /> MQ
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> REST
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        {isLoading && (
          <div className="space-y-1 px-1">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        )}

        {!isLoading && (!entries || entries.length === 0) && (
          <p className="px-1 text-[10px] text-slate-400 italic">No activity recorded yet.</p>
        )}

        {entries && entries.length > 0 && (
          <div className="space-y-0.5">
            {entries.map((e) => {
              const isMQ      = e.trigger_src === 'MQ'
              const noFinish  = e.finished_at === null && e.duration_ms === null
              const elapsedMs = Date.now() - new Date(e.triggered_at).getTime()
              const stale     = noFinish && elapsedMs >= STALE_RUNNING_MS
              const running   = noFinish && !stale
              const dur       = stale
                ? { text: '—', color: 'text-slate-500' }
                : durationLabel(e.duration_ms, e.finished_at)

              return (
                <div
                  key={e.id}
                  className={clsx(
                    'group flex items-center gap-2 rounded px-2 py-1 text-[10px] transition-colors',
                    running
                      ? 'bg-sky-500/5 border border-sky-500/20'
                      : 'hover:bg-slate-50 dark:hover:bg-sky-900/10'
                  )}
                >
                  {/* Source badge */}
                  <span className={clsx(
                    'flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide',
                    isMQ
                      ? 'bg-purple-500/10 text-purple-400'
                      : 'bg-blue-500/10 text-blue-400'
                  )}>
                    {isMQ ? 'MQ' : 'REST'}
                  </span>

                  {/* Job name */}
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-600 dark:text-slate-300">
                    {JOB_LABELS[e.job_name] ?? e.job_name}
                  </span>

                  {/* Running indicator (only when genuinely in-flight) */}
                  {running && <Radio size={9} className="flex-shrink-0 animate-pulse text-sky-400" />}

                  {/* Duration */}
                  <span className={clsx('flex-shrink-0 font-mono font-bold', dur.color)}>
                    {dur.text}
                  </span>

                  {/* Time ago */}
                  <span className="flex-shrink-0 font-mono text-[9px] text-slate-400 dark:text-slate-600">
                    {timeAgo(e.triggered_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SystemHealth({ totalStates, kpis }: { totalStates: number; kpis: KpiStats }) {
  const healthyCount = kpis.confirmedStates + kpis.completedStates
  const unhealthyCount = kpis.failedStates + kpis.abandonedStates + kpis.brokenStates
  const isHealthy = unhealthyCount === 0

  const healthItems = [
    { label: 'Total Index Records', value: totalStates.toLocaleString(), icon: Database, color: 'text-slate-400 dark:text-slate-500', ok: true },
    { label: 'Active Instruments', value: kpis.activeInstruments.toLocaleString(), icon: BarChart3, color: 'text-sky-500', ok: kpis.activeInstruments > 0 },
    { label: 'Confirmed Operations', value: kpis.confirmedStates.toLocaleString(), icon: CheckCircle2, color: 'text-emerald-500', ok: true },
    { label: 'Pipeline Health Rate', value: totalStates > 0 ? `${Math.round((healthyCount / totalStates) * 100)}%` : '—', icon: Activity, color: isHealthy ? 'text-emerald-400' : 'text-amber-400', ok: isHealthy },
    { label: 'Pending & In-Flight', value: (kpis.pendingStates + kpis.processedStates).toLocaleString(), icon: RefreshCw, color: 'text-blue-500', ok: true },
    { label: 'Outages & Attention', value: unhealthyCount.toLocaleString(), icon: AlertTriangle, color: unhealthyCount === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-red-400 animate-pulse', ok: unhealthyCount === 0 },
    { label: 'WS Signal Connection', value: 'Live Ping', icon: Wifi, color: 'text-emerald-400', ok: true },
  ]

  return (
    <div className="space-y-2.5">
      {healthItems.map(({ label, value, icon: Icon, color, ok }) => (
        <div key={label} className="flex items-center justify-between border-b border-slate-200 pb-1.5 last:border-0 last:pb-0 dark:border-sky-900/30">
          <div className="flex items-center gap-2">
            <Icon size={13} className={clsx('stroke-[2.2px]', ok ? 'text-emerald-400' : 'text-red-400')} />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{label}</span>
          </div>
          <span className={clsx('text-xs font-bold font-mono', color)}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

function StateBreakdown({ kpis }: { kpis: KpiStats }) {
  const rows = [
    { label: 'CONFIRMED',  value: kpis.confirmedStates,  bar: 'bg-emerald-500', dot: 'bg-emerald-400', text: 'text-emerald-400', hover: 'hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10' },
    { label: 'COMPLETED',  value: kpis.completedStates,  bar: 'bg-teal-500',    dot: 'bg-teal-400',    text: 'text-teal-400',    hover: 'hover:bg-teal-500/5 dark:hover:bg-teal-500/10' },
    { label: 'PENDING',    value: kpis.pendingStates,    bar: 'bg-amber-500',   dot: 'bg-amber-400',   text: 'text-amber-400',   hover: 'hover:bg-amber-500/5 dark:hover:bg-amber-500/10' },
    { label: 'PROCESSED',  value: kpis.processedStates,  bar: 'bg-blue-500',    dot: 'bg-blue-400',    text: 'text-blue-400',    hover: 'hover:bg-blue-500/5 dark:hover:bg-blue-500/10' },
    { label: 'NOT_FOUND',  value: kpis.notFoundStates,   bar: 'bg-yellow-500',  dot: 'bg-yellow-400',  text: 'text-yellow-400',  hover: 'hover:bg-yellow-500/5 dark:hover:bg-yellow-500/10' },
    { label: 'FAILED',     value: kpis.failedStates,     bar: 'bg-rose-500',    dot: 'bg-rose-400',    text: 'text-rose-400',    hover: 'hover:bg-rose-500/5 dark:hover:bg-rose-500/10' },
    { label: 'BROKEN',     value: kpis.brokenStates,     bar: 'bg-orange-500',  dot: 'bg-orange-400',  text: 'text-orange-400',  hover: 'hover:bg-orange-500/5 dark:hover:bg-orange-500/10' },
    { label: 'ABANDONED',  value: kpis.abandonedStates,  bar: 'bg-red-500',     dot: 'bg-red-400',     text: 'text-red-400',     hover: 'hover:bg-red-500/5 dark:hover:bg-red-500/10' },
  ]
  const total = kpis.totalStates || 1

  return (
    <div className="space-y-1 pb-1">
      {rows.map(({ label, value, bar, dot, text, hover }) => {
        const pct = (value / total) * 100
        const pctLabel = pct < 0.1 && value > 0 ? '<0.1%' : `${pct.toFixed(1)}%`

        return (
          <div key={label} className={clsx('group -mx-1 rounded px-1 py-0.5 transition-colors', hover)}>
            <div className="mb-0.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={clsx('h-1.5 w-1.5 flex-shrink-0 rounded-full', dot)} />
                <span className={clsx('font-mono text-[10px] font-semibold', text)}>{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx('font-mono text-[10px] font-bold tabular-nums', text)}>
                  {value.toLocaleString()}
                </span>
                <span className="w-10 text-right font-mono text-[9px] tabular-nums text-slate-400 dark:text-slate-600">
                  {pctLabel}
                </span>
              </div>
            </div>
            <div className="ml-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[#071628] border border-slate-200/60 dark:border-sky-900/20">
              <div
                className={clsx('h-full rounded-full transition-all duration-500 ease-out', bar)}
                style={{ width: `${Math.min(100, pct)}%`, minWidth: value > 0 ? '3px' : '0' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
