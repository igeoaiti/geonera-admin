import { useState, useEffect } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery'
import { wsEvents } from '@/lib/wsEvents'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, Legend, ResponsiveContainer,
} from 'recharts'
import { ChevronLeft, ChevronRight, ExternalLink, Filter, RefreshCw, X, Copy, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TableSkeleton, ChartSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { api } from '@/lib/api'
import type { StateStatus } from '@/types'
import { STATUS_COLORS } from '@/lib/constants'
import { JAEGER_URL } from '@/lib/env'

// ─── Config ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

const ALL_STATUSES: StateStatus[] = [
  'PENDING','PROCESSED','NOT_FOUND','FAILED','COMPLETED','BROKEN','CONFIRMED','ABANDONED',
]

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-sky-200/70 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-md dark:border-slate-700/60 dark:bg-[#0F121D]/95">
        <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
        <div className="mt-2 space-y-1">
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-4 justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.fill ?? p.color }} />
                {p.name}:
              </span>
              <span className="font-mono font-bold text-sky-900 dark:text-slate-100">{p.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

// ─── Filter Bar ──────────────────────────────────────────────────────────────

interface Filters {
  status: string
  jobType: string
  instrumentId: string
  minRetry: number
  minStreak: number
}

// ─── Quick Preset definitions ─────────────────────────────────────────────────

const PRESETS: { label: string; emoji: string; color: string; filters: Partial<Filters>; description: string }[] = [
  {
    label: 'FAILED',
    emoji: '🔴',
    color: 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',
    filters: { status: 'FAILED', jobType: '', instrumentId: '', minRetry: 0, minStreak: 0 },
    description: 'All rows currently in FAILED state',
  },
  {
    label: 'ABANDONED',
    emoji: '⛔',
    color: 'border-red-600/30 bg-red-600/10 text-red-400 hover:bg-red-600/20',
    filters: { status: 'ABANDONED', jobType: '', instrumentId: '', minRetry: 0, minStreak: 0 },
    description: 'Permanently abandoned (retry exhausted)',
  },
  {
    label: 'High Retry (≥3)',
    emoji: '🔄',
    color: 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
    filters: { status: '', jobType: '', instrumentId: '', minRetry: 3, minStreak: 0 },
    description: 'Rows that have been retried 3+ times',
  },
  {
    label: 'High Streak (≥3)',
    emoji: '❄️',
    color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
    filters: { status: '', jobType: '', instrumentId: '', minRetry: 0, minStreak: 3 },
    description: 'NOT_FOUND streak ≥3 (zero-row threshold)',
  },
]

function FilterBar({
  filters,
  onChange,
  onReset,
  instruments,
}: {
  filters: Filters
  onChange: (f: Partial<Filters>) => void
  onReset: () => void
  instruments: { id: string; name: string }[]
}) {
  const hasActive = filters.status || filters.jobType || filters.instrumentId || filters.minRetry > 0 || filters.minStreak > 0

  // Detect active preset
  const activePreset = PRESETS.find(
    (p) =>
      p.filters.status      === filters.status &&
      p.filters.jobType     === filters.jobType &&
      p.filters.instrumentId=== filters.instrumentId &&
      p.filters.minRetry    === filters.minRetry &&
      p.filters.minStreak   === filters.minStreak
  )

  return (
    <div className="flex flex-shrink-0 items-center gap-2 flex-wrap">
      <Filter size={13} className="text-slate-500 flex-shrink-0" />

      {/* Quick preset pills — compact, same row */}
      <div className="flex items-center gap-1 border-r border-sky-200/70 pr-2 dark:border-slate-700/50">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            title={p.description}
            onClick={() => onChange(p.filters)}
            className={clsx(
              'rounded border px-2 py-0.5 text-[10px] font-semibold transition-all whitespace-nowrap',
              p.color,
              activePreset?.label === p.label && 'ring-1 ring-current'
            )}
          >
            {p.emoji} {p.label}
          </button>
        ))}
      </div>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value })}
        className="rounded-lg border border-sky-200/70 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none transition-colors focus:border-sky-500/60 dark:border-sky-900/30 dark:bg-[#071628] dark:text-slate-300"
      >
        <option value="">All Statuses</option>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Job Type */}
      <div className="flex overflow-hidden rounded-lg border border-sky-200/70 bg-white dark:border-sky-900/30 dark:bg-[#071628]">
        {(['', 'TICK', 'CANDLE'] as const).map((jt) => (
          <button
            key={jt}
            onClick={() => onChange({ jobType: jt })}
            className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              filters.jobType === jt
                ? 'bg-sky-600 text-white'
                : 'bg-white text-slate-500 hover:bg-sky-50 hover:text-sky-700 dark:bg-[#071628] dark:text-slate-400 dark:hover:bg-sky-900/40 dark:hover:text-slate-200'
            }`}
          >
            {jt || 'All'}
          </button>
        ))}
      </div>

      {/* Instrument */}
      <select
        value={filters.instrumentId}
        onChange={(e) => onChange({ instrumentId: e.target.value })}
        className="rounded-lg border border-sky-200/70 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none transition-colors focus:border-sky-500/60 dark:border-sky-900/30 dark:bg-[#071628] dark:text-slate-300"
      >
        <option value="">All Instruments</option>
        {instruments.map((i) => (
          <option key={i.id} value={i.id}>{i.name.toUpperCase()}</option>
        ))}
      </select>

      {hasActive && (
        <button
          onClick={onReset}
          className="ml-auto flex flex-shrink-0 items-center gap-1 rounded border border-sky-200/70 px-2 py-0.5 text-[10px] text-slate-500 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
        >
          <X size={9} /> Clear
        </button>
      )}

      {hasActive && (
        <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[9px] font-bold text-white flex-shrink-0">
          FILTERED
        </span>
      )}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  pages,
  total,
  limit,
  onPage,
}: {
  page: number
  pages: number
  total: number
  limit: number
  onPage: (p: number) => void
}) {
  if (pages <= 1) return null
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="flex flex-shrink-0 items-center justify-between border-t border-sky-200/70 bg-sky-50/80 px-4 py-2 dark:border-sky-900/30 dark:bg-[#040E1C]/60">
      <span className="text-[11px] text-slate-500 font-mono">
        {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()} rows
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          className="flex items-center gap-1 rounded-lg border border-sky-200/70 px-2 py-1 text-[11px] text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-30 dark:border-sky-900/30 dark:text-slate-400 dark:hover:bg-sky-900/30"
        >
          <ChevronLeft size={12} /> Prev
        </button>
        {/* Page window */}
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          const start = Math.max(1, Math.min(page - 2, pages - 4))
          return start + i
        }).map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-mono font-semibold transition-colors ${
              p === page
                ? 'border-sky-500/50 bg-sky-600 text-white'
                : 'border-sky-200/70 text-slate-500 hover:bg-sky-50 hover:text-sky-700 dark:border-sky-900/30 dark:text-slate-400 dark:hover:bg-sky-900/30'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page === pages}
          onClick={() => onPage(page + 1)}
          className="flex items-center gap-1 rounded-lg border border-sky-200/70 px-2 py-1 text-[11px] text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-30 dark:border-sky-900/30 dark:text-slate-400 dark:hover:bg-sky-900/30"
        >
          Next <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Jaeger Deep-link ─────────────────────────────────────────────────────────
// Jaeger search requires `tags` as a URL-encoded JSON object, e.g.:
//   tags={"instrument.name":"xauusd"}
// Passing a plain key=value string causes:
//   "malformed 'tags' parameter, cannot unmarshal JSON: invalid character..."

function jaegerSearchUrl(instrumentName: string, _timestamp: string): string {
  const tagsJson = JSON.stringify({ 'instrument.name': instrumentName.toLowerCase() })
  const q = new URLSearchParams({
    service:  'geonera-ingestion',
    tags:     tagsJson,
    lookback: '24h',
  })
  return `${JAEGER_URL}/search?${q}`
}

function CopyButton({ text, title }: { text: string; title: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={clsx(
        "flex items-center justify-center rounded p-1 transition-colors",
        copied
          ? "bg-emerald-500/10 text-emerald-400"
          : "text-slate-600 hover:bg-sky-500/10 hover:text-sky-400"
      )}
      title={copied ? "Copied!" : title}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StateMonitorPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<Filters>({ status: '', jobType: '', instrumentId: '', minRetry: 0, minStreak: 0 })
  const [page, setPage] = useState(1)

  const dist = useRealtimeQuery('distribution', {
    queryKey: ['states', 'distribution'],
    queryFn: api.states.distribution,
  })

  const instruments = useQuery({
    queryKey: ['instruments'],
    queryFn: api.instruments.list,
  })

  // Invalidate the recent-states table whenever the distribution WS event arrives
  // (immediate path: ingestion job completes → RabbitMQ → broadcastAll → WS push).
  useEffect(() => {
    return wsEvents.on('distribution', () => {
      queryClient.invalidateQueries({ queryKey: ['states', 'recent'] })
    })
  }, [queryClient])

  // Also invalidate on WS reconnect so stale rows accumulated during disconnect
  // are replaced immediately (mirrors the useRealtimeQuery reconnect behaviour).
  useEffect(() => {
    return wsEvents.on('ws:connected', () => {
      queryClient.invalidateQueries({ queryKey: ['states', 'recent'] })
    })
  }, [queryClient])

  const recent = useQuery({
    queryKey: ['states', 'recent', filters, page],
    queryFn: () =>
      api.states.recent({
        page,
        limit: PAGE_SIZE,
        status: filters.status || undefined,
        jobType: filters.jobType || undefined,
        instrumentId: filters.instrumentId || undefined,
        minRetry:  filters.minRetry  > 0 ? filters.minRetry  : undefined,
        minStreak: filters.minStreak > 0 ? filters.minStreak : undefined,
      }),
    placeholderData: keepPreviousData,
    // Fallback: when WS events don't arrive (polling path), keep the table fresh.
    refetchInterval: 30_000,
  })

  const handleFilterChange = (delta: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...delta }))
    setPage(1) // reset page on filter change
  }

  const handleReset = () => {
    setFilters({ status: '', jobType: '', instrumentId: '', minRetry: 0, minStreak: 0 })
    setPage(1)
  }

  const CHART_H = 180

  // Aggregate for charts
  const byStatus = dist.data
    ? Object.entries(
        dist.data.reduce<Record<string, number>>((acc, d) => {
          acc[d.status] = (acc[d.status] ?? 0) + d.count
          return acc
        }, {})
      )
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
    : []

  const byJobType = dist.data
    ? [
        {
          name: 'TICK',
          ...dist.data
            .filter((d) => d.jobType === 'TICK')
            .reduce<Record<string, number>>((a, d) => ({ ...a, [d.status]: d.count }), {}),
        },
        {
          name: 'CANDLE',
          ...dist.data
            .filter((d) => d.jobType === 'CANDLE')
            .reduce<Record<string, number>>((a, d) => ({ ...a, [d.status]: d.count }), {}),
        },
      ]
    : []

  const stateData = recent.data

  return (
    <div className="flex h-full flex-col gap-3.5 overflow-hidden p-3.5">
      {/* Charts row */}
      <div className="grid flex-shrink-0 grid-cols-2 gap-3.5" style={{ height: CHART_H + 52 }}>
        <Card title="Distribution by Status" subtitle="All job types combined · auto-refresh 15s">
          {dist.isLoading && <ChartSkeleton />}
          {dist.isError && <EmptyState title="Loading failed" message="Could not fetch status distribution." />}
          {dist.data && (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={byStatus} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                  axisLine={{ stroke: '#bae6fd' }}
                  tickLine={{ stroke: '#bae6fd' }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  width={45}
                  axisLine={{ stroke: '#bae6fd' }}
                  tickLine={{ stroke: '#bae6fd' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(51, 65, 85, 0.15)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status as StateStatus] ?? '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="TICK vs CANDLE Breakdown" subtitle="Status count per job type">
          {dist.isLoading && <ChartSkeleton />}
          {dist.isError && <EmptyState title="Loading failed" message="Could not fetch job type breakdown." />}
          {dist.data && (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={byJobType} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                  axisLine={{ stroke: '#bae6fd' }}
                  tickLine={{ stroke: '#bae6fd' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  width={45}
                  axisLine={{ stroke: '#bae6fd' }}
                  tickLine={{ stroke: '#bae6fd' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(51, 65, 85, 0.15)' }} />
                <Legend wrapperStyle={{ fontSize: 10, fill: '#64748b', paddingTop: 6 }} />
                {Object.keys(STATUS_COLORS).map((s) => (
                  <Bar key={s} dataKey={s} name={s} stackId="a" fill={STATUS_COLORS[s as StateStatus]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* State table — filter embedded inside card */}
      <Card
        title="State Records"
        subtitle={
          stateData
            ? `${stateData.total.toLocaleString()} total · page ${stateData.page}/${stateData.pages} · auto-refresh 8s`
            : 'Loading…'
        }
        action={
          recent.isFetching ? (
            <RefreshCw size={13} className="animate-spin text-slate-500" />
          ) : null
        }
        className="flex min-h-0 flex-1 flex-col border-sky-200/70 bg-white/90 dark:border-sky-900/30 dark:bg-[#111520]"
        noPadding
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Filter bar — inside card, clearly separated from chart section above */}
          <div className="flex-shrink-0 border-b border-sky-200/70 bg-sky-50/80 px-4 py-2 dark:border-slate-800/60 dark:bg-[#040E1C]/30">
            <FilterBar
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleReset}
              instruments={instruments.data ?? []}
            />
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-auto">
            {recent.isLoading && <TableSkeleton cols={9} rows={10} />}
            {recent.isError && <EmptyState title="Could not load records" message="An error occurred while fetching state records." />}
            {stateData && stateData.data.length === 0 && (
              <EmptyState title="No records match" message="Try adjusting or clearing the filters above." />
            )}
            {stateData && stateData.data.length > 0 && (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 border-b border-sky-200/70 bg-sky-50/95 backdrop-blur-md dark:border-sky-900/30 dark:bg-[#040E1C]/95">
                  <tr>
                    {[
                      'Instrument', 'Job', 'Timestamp', 'Status',
                      'Prev Status', 'Retry', 'Streak', 'Holiday',
                      'Updated At', 'Trace',
                    ].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100 dark:divide-slate-800/30">
                  {stateData.data.map((s) => (
                    <tr
                      key={s.id}
                      className="group transition-colors duration-100 hover:bg-sky-50/80 dark:hover:bg-sky-900/10"
                    >
                      {/* Instrument */}
                      <td className="px-3 py-2 font-mono text-xs font-bold uppercase text-sky-900 dark:text-slate-300">
                        {s.instrument?.name ?? s.instrumentId.slice(0, 8)}
                      </td>

                      {/* Job Type */}
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${
                            s.jobType === 'TICK'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                          }`}
                        >
                          {s.jobType}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {new Date(s.timestamp).toISOString().slice(0, 16).replace('T', ' ')}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2">
                        <StatusBadge status={s.status} size="xs" />
                      </td>

                      {/* Previous Status */}
                      <td className="px-3 py-2">
                        {s.previousStatus ? (
                          <StatusBadge status={s.previousStatus} size="xs" />
                        ) : (
                          <span className="text-[10px] text-slate-600">—</span>
                        )}
                      </td>

                      {/* Retry Count */}
                      <td className="px-3 py-2 text-center">
                        {s.retryCount > 0 ? (
                          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/20">
                            {s.retryCount}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600 font-mono">0</span>
                        )}
                      </td>

                      {/* Not Found Streak */}
                      <td className="px-3 py-2 text-center">
                        {s.notFoundStreak > 0 ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-bold border ${
                              s.notFoundStreak >= 3
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}
                          >
                            {s.notFoundStreak}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600 font-mono">0</span>
                        )}
                      </td>

                      {/* Is Holiday */}
                      <td className="px-3 py-2 text-center">
                        {s.isHoliday ? (
                          <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                            YES
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600">—</span>
                        )}
                      </td>

                      {/* Updated At */}
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-500">
                        {new Date(s.updatedAt).toISOString().slice(0, 19).replace('T', ' ')}
                      </td>

                      {/* Copy Buttons */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <CopyButton text={s.id} title="Copy State ID" />
                          {s.traceId ? (
                            <CopyButton text={s.traceId} title="Copy Trace ID" />
                          ) : (
                            <span className="text-[10px] text-slate-600 w-5 text-center">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {stateData && stateData.pages > 1 && (
            <Pagination
              page={stateData.page}
              pages={stateData.pages}
              total={stateData.total}
              limit={stateData.limit}
              onPage={setPage}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
