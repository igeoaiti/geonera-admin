import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery'
import {
  Clock,
  Play,
  Pause,
  Plus,
  Rabbit,
  RefreshCw,
  Send,
  Trash2,
  X,
  Zap,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { Cron, CronStatus, CronTriggerMethod } from '@/types'
import { clsx } from 'clsx'
import { useSecureConfirm } from '@/components/ui/useSecureConfirm'

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<CronStatus, string> = {
  ACTIVE:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PAUSED:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  INACTIVE: 'bg-slate-700/40 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700',
}
const STATUS_DOT: Record<CronStatus, string> = {
  ACTIVE:   'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse',
  PAUSED:   'bg-amber-400',
  INACTIVE: 'bg-slate-600',
}

function StatusBadge({ status }: { status: CronStatus }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', STATUS_STYLES[status])}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
      {status}
    </span>
  )
}

// ─── Trigger method badge ──────────────────────────────────────────────────────
function MethodBadge({ method }: { method: CronTriggerMethod }) {
  return method === 'RABBITMQ' ? (
    <span className="inline-flex items-center gap-1 rounded border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-purple-400">
      <Rabbit size={9} />MQ
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
      <Globe size={9} />HTTP
    </span>
  )
}

// ─── Cron row ─────────────────────────────────────────────────────────────────
function CronRow({
  cron,
  onToggle,
  onTrigger,
  onDelete,
  isToggling,
  isTriggering,
  isDeleting,
}: {
  cron: Cron
  onToggle: () => void
  onTrigger: () => void
  onDelete: () => void
  isToggling: boolean
  isTriggering: boolean
  isDeleting: boolean
}) {
  const [showResult, setShowResult] = useState(false)

  const lastResult = cron.lastResult as Record<string, unknown> | null
  const resultSuccess = lastResult?.success as boolean | undefined

  return (
    <tr className="group border-b border-slate-200 dark:border-sky-900/30/60 transition-colors hover:bg-sky-50 dark:hover:bg-slate-800 dark:bg-[#030C18]/20">
      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={cron.status as CronStatus} />
      </td>

      {/* Name + description */}
      <td className="px-4 py-3">
        <div className="font-mono text-sm font-semibold text-slate-800 dark:text-sky-100">{cron.name}</div>
        {cron.description && (
          <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 leading-snug max-w-xs">{cron.description}</div>
        )}
      </td>

      {/* Cron expression */}
      <td className="px-4 py-3">
        <code className="rounded bg-slate-100 dark:bg-slate-900 px-2 py-1 text-[11px] font-mono text-indigo-300 border border-slate-200 dark:border-sky-900/30">
          {cron.cronExpr}
        </code>
      </td>

      {/* Next run */}
      <td className="px-4 py-3">
        {cron.nextRunAt ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Clock size={11} className="text-slate-600" />
            <span className="font-mono">{new Date(cron.nextRunAt).toISOString().slice(11, 19)} UTC</span>
            <span className="text-slate-600 text-[10px]">{new Date(cron.nextRunAt).toLocaleDateString()}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>

      {/* Target (queue / path) */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <MethodBadge method={cron.triggerMethod as CronTriggerMethod} />
          <code className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
            {cron.queueName ?? cron.httpPath ?? '—'}
          </code>
        </div>
      </td>

      {/* Last triggered + result */}
      <td className="px-4 py-3">
        {cron.lastTriggeredAt ? (
          <div className="flex items-center gap-2">
            {resultSuccess === true ? (
              <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
            ) : resultSuccess === false ? (
              <XCircle size={12} className="text-red-400 flex-shrink-0" />
            ) : null}
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
              {new Date(cron.lastTriggeredAt).toISOString().slice(0, 19).replace('T', ' ')}
            </span>
            {lastResult && (
              <button
                onClick={() => setShowResult((p) => !p)}
                className="rounded p-0.5 text-slate-600 hover:bg-sky-50 dark:hover:bg-slate-800 dark:bg-[#030C18] hover:text-slate-400 dark:text-slate-500"
              >
                {showResult ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-600">Never</span>
        )}
        {showResult && lastResult && (
          <pre className="mt-1.5 max-h-24 overflow-auto rounded-lg border border-slate-200 dark:border-sky-900/30 bg-[#07090F] p-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {/* Toggle Active/Paused */}
          <button
            title={cron.status === 'ACTIVE' ? 'Pause' : 'Activate'}
            onClick={onToggle}
            disabled={isToggling || cron.status === 'INACTIVE'}
            className={clsx(
              'rounded-lg p-1.5 transition-colors disabled:opacity-40',
              cron.status === 'ACTIVE'
                ? 'text-amber-400 hover:bg-amber-500/10'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            )}
          >
            {isToggling ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : cron.status === 'ACTIVE' ? (
              <Pause size={13} />
            ) : (
              <Play size={13} />
            )}
          </button>

          {/* Manual trigger */}
          <button
            title="Trigger now"
            onClick={onTrigger}
            disabled={isTriggering}
            className="rounded-lg p-1.5 text-indigo-400 transition-colors hover:bg-indigo-500/10 disabled:opacity-40"
          >
            {isTriggering ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
          </button>

          {/* Delete */}
          <button
            title="Delete"
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
          >
            {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Add form ──────────────────────────────────────────────────────────────────
const WORKER_PRESETS = [
  { key: 'ticks/regular',    queue: 'jobs.ticks.regular',    path: '/ticks/regular',    label: 'Ticks Regular' },
  { key: 'ticks/backfill',   queue: 'jobs.ticks.backfill',   path: '/ticks/backfill',   label: 'Ticks Backfill' },
  { key: 'candles/regular',  queue: 'jobs.candles.regular',  path: '/candles/regular',  label: 'Candles Regular' },
  { key: 'candles/backfill', queue: 'jobs.candles.backfill', path: '/candles/backfill', label: 'Candles Backfill' },
  { key: 'maintenance',      queue: 'jobs.maintenance',      path: '/maintenance',      label: 'Maintenance' },
  { key: 'sync',             queue: 'jobs.sync',             path: '/sync',             label: 'Outbox Sync' },
]

function AddCronForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { requireConfirmation } = useSecureConfirm()
  const [form, setForm] = useState({
    name: '',
    description: '',
    cronExpr: '*/5 * * * *',
    workerKey: 'maintenance',
    triggerMethod: 'RABBITMQ' as CronTriggerMethod,
    queueName: 'jobs.maintenance',
    httpPath: '/maintenance',
    status: 'ACTIVE' as CronStatus,
  })
  const [error, setError] = useState('')

  const mut = useMutation({
    mutationFn: api.crons.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crons'] }); onClose() },
    onError: (e: Error) => setError(e.message),
  })

  const applyPreset = (preset: typeof WORKER_PRESETS[0]) => {
    setForm((p) => ({
      ...p,
      name: preset.key.replace('/', '-'),
      workerKey: preset.key,
      queueName: preset.queue,
      httpPath: preset.path,
    }))
  }

  return (
    <Card
      title="New Cron Job"
      subtitle="Pushes to RabbitMQ on schedule"
      action={
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-sky-50 dark:hover:bg-slate-800 dark:bg-[#030C18] hover:text-slate-700 dark:text-slate-300 transition-colors">
          <X size={15} />
        </button>
      }
      className="w-80 flex-shrink-0 border-slate-300 dark:border-slate-700/60 bg-[#0F121C] shadow-2xl"
      bodyClassName="p-4 space-y-3"
    >
      {/* Worker presets */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-400 dark:text-slate-500">Worker Preset</label>
        <div className="flex flex-wrap gap-1.5">
          {WORKER_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p)}
              className={clsx(
                'rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                form.workerKey === p.key
                  ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300'
                  : 'border-slate-200 dark:border-sky-900/30 text-slate-400 dark:text-slate-500 hover:border-slate-600 hover:text-slate-700 dark:text-slate-300'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {[
        { key: 'name', label: 'Name', placeholder: 'e.g. ticks-regular' },
        { key: 'description', label: 'Description', placeholder: 'Optional description' },
        { key: 'cronExpr', label: 'Cron Expression (UTC)', placeholder: '*/5 * * * *' },
        { key: 'queueName', label: 'RabbitMQ Queue', placeholder: 'jobs.ticks.regular' },
        { key: 'httpPath', label: 'HTTP Fallback Path', placeholder: '/ticks/regular' },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="mb-1 block text-xs font-semibold text-slate-400 dark:text-slate-500">{label}</label>
          <input
            type="text"
            placeholder={placeholder}
            value={(form as any)[key]}
            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 dark:border-sky-900/30 bg-[#090B11] px-3 py-1.5 text-sm text-slate-800 dark:text-sky-100 placeholder-slate-700 outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/10"
          />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400 dark:text-slate-500">Method</label>
          <select
            value={form.triggerMethod}
            onChange={(e) => setForm((p) => ({ ...p, triggerMethod: e.target.value as CronTriggerMethod }))}
            className="w-full rounded-lg border border-slate-200 dark:border-sky-900/30 bg-[#090B11] px-3 py-1.5 text-sm text-slate-800 dark:text-sky-100 outline-none focus:border-indigo-500/80"
          >
            <option value="RABBITMQ">RabbitMQ</option>
            <option value="HTTP">HTTP</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400 dark:text-slate-500">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as CronStatus }))}
            className="w-full rounded-lg border border-slate-200 dark:border-sky-900/30 bg-[#090B11] px-3 py-1.5 text-sm text-slate-800 dark:text-sky-100 outline-none focus:border-indigo-500/80"
          >
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/10 bg-rose-500/5 px-3 py-2 text-xs text-rose-400">{error}</p>
      )}

      <div className="flex gap-2 border-t border-slate-200 dark:border-sky-900/30/60 pt-3">
        <button
          onClick={() => {
            requireConfirmation({
              title: 'Confirm Create Cron Job',
              message: 'You are about to create a new scheduled job.',
              actionLabel: 'Create Job',
              onConfirm: () => mut.mutate({ ...form, description: form.description || undefined })
            })
          }}
          disabled={mut.isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          <Zap size={12} />
          {mut.isPending ? 'Creating…' : 'Create Job'}
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-200 dark:border-sky-900/30 bg-white dark:bg-[#071628] px-4 py-2 text-sm text-slate-400 dark:text-slate-500 hover:bg-sky-50 dark:hover:bg-slate-800 dark:bg-[#030C18]"
        >
          Cancel
        </button>
      </div>
    </Card>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function CronJobsPage() {
  const qc = useQueryClient()
  const { requireConfirmation } = useSecureConfirm()
  const [showForm, setShowForm] = useState(false)
  const [triggerLog, setTriggerLog] = useState<{ id: string; result: string; success: boolean; ts: string }[]>([])

  const { data, isLoading, isError } = useRealtimeQuery('crons', {
    queryKey: ['crons'],
    queryFn: api.crons.list,
  })

  const mutToggle = useMutation({
    mutationFn: api.crons.toggleStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crons'] }),
  })

  const mutTrigger = useMutation({
    mutationFn: (id: string) => api.crons.trigger(id),
    onSuccess: (result, id) => {
      qc.invalidateQueries({ queryKey: ['crons'] })
      const cron = data?.find((c) => c.id === id)
      setTriggerLog((prev) => [
        {
          id,
          result: cron?.name ?? id,
          success: result.success,
          ts: new Date().toISOString().slice(11, 19),
        },
        ...prev.slice(0, 19),
      ])
    },
  })

  const mutDelete = useMutation({
    mutationFn: api.crons.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crons'] }),
  })

  // Stats
  const active = data?.filter((c) => c.status === 'ACTIVE').length ?? 0
  const paused = data?.filter((c) => c.status === 'PAUSED').length ?? 0
  const mqJobs = data?.filter((c) => c.triggerMethod === 'RABBITMQ').length ?? 0

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      {/* Summary row */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-4">
        {[
          { label: 'Total Jobs', value: data?.length ?? 0, color: 'text-indigo-400', icon: Clock },
          { label: 'Active', value: active, color: 'text-emerald-400', icon: Play },
          { label: 'Paused', value: paused, color: 'text-amber-400', icon: Pause },
          { label: 'Via RabbitMQ', value: mqJobs, color: 'text-purple-400', icon: Rabbit },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-sky-900/30 bg-white dark:bg-[#071628] px-5 py-4">
            <Icon size={20} className={color} strokeWidth={1.8} />
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
              <p className="text-2xl font-bold tabular-nums text-slate-100">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Table */}
        <Card
          title="Scheduled Jobs"
          subtitle="All cron expressions run in UTC · Primary trigger: RabbitMQ"
          className="flex-1 min-w-0"
          noPadding
          scrollable
          action={
            <button
              onClick={() => setShowForm((p) => !p)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white hover:bg-indigo-500"
            >
              <Plus size={12} /> New Job
            </button>
          }
        >
          {isLoading && (
            <div className="flex h-40 items-center justify-center">
              <RefreshCw size={20} className="animate-spin text-slate-600" />
            </div>
          )}
          {isError && (
            <div className="flex h-40 items-center justify-center text-sm text-red-400">
              Failed to load cron jobs — is the backend running?
            </div>
          )}
          {data && (
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-white dark:bg-[#071628]">
                <tr className="border-b border-slate-200 dark:border-sky-900/30">
                  {['Status', 'Name', 'Expression', 'Next Run', 'Target', 'Last Run', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((cron) => (
                  <CronRow
                    key={cron.id}
                    cron={cron}
                    onToggle={() => {
                      requireConfirmation({
                        title: 'Confirm Status Toggle',
                        message: 'You are about to change the active status of this cron job.',
                        actionLabel: 'Change Status',
                        onConfirm: () => mutToggle.mutate(cron.id)
                      })
                    }}
                    onTrigger={() => {
                      requireConfirmation({
                        title: 'Confirm Manual Run',
                        message: 'You are about to manually execute this cron job.',
                        actionLabel: 'Execute Job',
                        onConfirm: () => mutTrigger.mutate(cron.id)
                      })
                    }}
                    onDelete={() => {
                      requireConfirmation({
                        title: 'Confirm Delete',
                        message: `You are about to permanently delete "${cron.name}".`,
                        actionLabel: 'Delete Job',
                        onConfirm: () => mutDelete.mutate(cron.id)
                      })
                    }}
                    isToggling={mutToggle.isPending && mutToggle.variables === cron.id}
                    isTriggering={mutTrigger.isPending && mutTrigger.variables === cron.id}
                    isDeleting={mutDelete.isPending && mutDelete.variables === cron.id}
                  />
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-slate-600">
                      No cron jobs — click "New Job" to add one
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>

        {/* Right panel: form or trigger log */}
        {showForm ? (
          <AddCronForm onClose={() => setShowForm(false)} />
        ) : (
          <Card
            title="Trigger Log"
            subtitle={`${triggerLog.length} manual triggers`}
            className="w-72 flex-shrink-0"
            scrollable
            noPadding
            bodyClassName="p-3 space-y-2"
          >
            {triggerLog.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-slate-600">
                Click ▷ on any job to fire it
              </div>
            ) : (
              triggerLog.map((entry, i) => (
                <div
                  key={i}
                  className={clsx(
                    'flex items-center justify-between rounded-lg border px-3 py-2 text-xs',
                    entry.success
                      ? 'border-emerald-500/15 bg-emerald-500/5'
                      : 'border-red-500/15 bg-red-500/5'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {entry.success
                      ? <CheckCircle2 size={12} className="text-emerald-400" />
                      : <XCircle size={12} className="text-red-400" />}
                    <span className="font-mono text-slate-700 dark:text-slate-300">{entry.result}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-600">{entry.ts}</span>
                </div>
              ))
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
