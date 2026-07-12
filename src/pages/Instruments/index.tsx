import { useState, useRef, useEffect } from 'react'
import type { InputHTMLAttributes } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import { Plus, Search, PauseCircle, Ban, Sparkles, X, Sliders, Clock, Power, Play } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { api } from '@/lib/api'
import type { Instrument, Timeframe } from '@/types'
import { clsx } from 'clsx'
import { useSecureConfirm } from '@/components/ui/useSecureConfirm'

// ─── Add Instrument Form ─────────────────────────────────────────────────────
function AddForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { requireConfirmation } = useSecureConfirm()
  const [form, setForm] = useState({
    name: '',
    description: '',
    assetClass: 'forex',
    divider: 100000,
    startDate: '2020-01-01T00:00:00Z',
    isActive: true,
  })
  const [error, setError] = useState('')

  const mut = useMutation({
    mutationFn: api.instruments.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instruments'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = () => {
    if (!form.name) {
      setError('Symbol name is required')
      return
    }
    requireConfirmation({
      title: 'Confirm Create Instrument',
      message: 'You are about to add a new financial instrument. This will initialize the data ingestion pipeline for this symbol.',
      actionLabel: 'Create Instrument',
      onConfirm: () => {
        mut.mutate({
          name: form.name,
          description: form.description || undefined,
          assetClass: form.assetClass || undefined,
          divider: form.divider || undefined,
          startDate: form.startDate || undefined,
          isActive: form.isActive,
        })
      }
    })
  }

  return (
    <Card 
      title="Create Instrument" 
      subtitle="Register a new currency or asset"
      action={
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-sky-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-sky-900/30 dark:hover:text-slate-300">
          <X size={15} />
        </button>
      }
      className="w-80 flex-shrink-0 animate-in fade-in slide-in-from-right-4 duration-300 border border-slate-300 dark:border-slate-700/60 bg-white dark:bg-[#071628] shadow-2xl" 
      bodyClassName="p-4 space-y-4"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">Symbol Symbol *</label>
          <input
            type="text"
            placeholder="e.g. eurusd"
            className="w-full rounded-lg border border-sky-200/70 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-500/80 focus:ring-2 focus:ring-sky-500/10 dark:border-sky-900/30 dark:bg-[#040E1C] dark:text-sky-100 dark:placeholder:text-slate-700"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">Description</label>
          <input
            type="text"
            placeholder="e.g. Euro / US Dollar"
            className="w-full rounded-lg border border-sky-200/70 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-500/80 focus:ring-2 focus:ring-sky-500/10 dark:border-sky-900/30 dark:bg-[#040E1C] dark:text-sky-100 dark:placeholder:text-slate-700"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">Asset Class</label>
          <select
            className="w-full rounded-lg border border-sky-200/70 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm outline-none transition-all focus:border-sky-500/80 focus:ring-2 focus:ring-sky-500/10 dark:border-sky-900/30 dark:bg-[#040E1C] dark:text-sky-100"
            value={form.assetClass}
            onChange={(e) => setForm((p) => ({ ...p, assetClass: e.target.value }))}
          >
            {['forex', 'commodity', 'crypto', 'index', 'stock'].map((c) => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">Price Divider</label>
          <input
            type="number"
            placeholder="100000"
            className="w-full rounded-lg border border-sky-200/70 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-500/80 focus:ring-2 focus:ring-sky-500/10 dark:border-sky-900/30 dark:bg-[#040E1C] dark:text-sky-100 dark:placeholder:text-slate-700"
            value={form.divider}
            onChange={(e) => setForm((p) => ({ ...p, divider: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">Start Date (UTC ISO)</label>
          <input
            type="text"
            placeholder="2020-01-01T00:00:00Z"
            className="w-full rounded-lg border border-sky-200/70 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-500/80 focus:ring-2 focus:ring-sky-500/10 dark:border-sky-900/30 dark:bg-[#040E1C] dark:text-sky-100 dark:placeholder:text-slate-700"
            value={form.startDate}
            onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
          />
        </div>

        {error && <p className="rounded-lg border border-rose-500/10 bg-rose-500/5 px-3 py-2 text-xs text-rose-400 font-medium">{error}</p>}

        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-sky-900/30 shadow-sm/80">
          <button
            onClick={handleSubmit}
            disabled={mut.isPending}
            className="interactive-element flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(14,165,233,0.22)] hover:bg-sky-500 disabled:opacity-50"
          >
            <Sparkles size={13} />
            {mut.isPending ? 'Adding…' : 'Submit'}
          </button>
          <button
            onClick={onClose}
            className="interactive-element rounded-lg border border-sky-200/70 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm hover:bg-sky-50 hover:text-slate-700 dark:border-sky-900/30 dark:bg-[#071628] dark:text-slate-500 dark:hover:bg-sky-900/30 dark:hover:text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </Card>
  )
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={clsx(
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ease-out border shadow-inner',
        checked ? 'bg-sky-600 border-sky-500' : 'bg-slate-200 border-slate-300 dark:bg-sky-900/30 dark:border-slate-700',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      <span
        className={clsx(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-[#071628] shadow-md transition-transform duration-300 ease-out',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

// ─── Indeterminate Checkbox ───────────────────────────────────────────────────
function IndeterminateCheckbox({ indeterminate, ...rest }: { indeterminate?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null!)
  useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate
    }
  }, [indeterminate, rest.checked])
  return (
    <input
      type="checkbox"
      ref={ref}
      className="h-4 w-4 cursor-pointer rounded border-sky-300 accent-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
      {...rest}
    />
  )
}

// ─── Timeframe Management Panel ────────────────────────────────────────────────
function TimeframePanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { requireConfirmation } = useSecureConfirm()
  const { data: timeframes, isLoading, isError } = useQuery<Timeframe[]>({
    queryKey: ['timeframes'],
    queryFn: api.timeframes.list,
  })

  const mutActive = useMutation({
    mutationFn: api.timeframes.toggleActive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeframes'] })
    },
  })

  return (
    <Card
      title="Timeframe Management"
      subtitle="Manage Dukascopy candle aggregation timeframes"
      action={
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-sky-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-sky-900/30 dark:hover:text-slate-300">
          <X size={15} />
        </button>
      }
      className="w-96 h-full flex-shrink-0 animate-in fade-in slide-in-from-right-4 duration-300 border border-slate-300 dark:border-slate-700/60 bg-white dark:bg-[#071628] shadow-2xl"
      bodyClassName="p-4 flex flex-col h-full min-h-0"
    >
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
        {isLoading && (
          <div className="flex flex-col gap-2 py-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-sky-100/70 dark:bg-sky-900/30" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-rose-500/10 bg-rose-500/5 px-3 py-4 text-center text-xs text-rose-400 font-medium">
            Failed to load timeframes.
          </div>
        )}

        {!isLoading && !isError && timeframes && (
          <div className="space-y-2">
            <div className="rounded-lg border border-sky-500/15 bg-indigo-500/5 p-3 mb-3">
              <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 block mb-1 leading-snug">
                ⚠️ ARCHITECTURE NOTICE
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                These 19 standard timeframes are baked into the Go Dukascopy ingestion architecture. Turning a timeframe off disables its Candle aggregation pipeline.
              </p>
            </div>

            {timeframes.map((tf) => (
              <div
                key={tf.id}
                className={clsx(
                  "flex items-center justify-between p-3 rounded-lg border transition-all duration-150",
                  tf.isActive
                    ? "border-sky-200/70 bg-white shadow-sm hover:bg-sky-50/70 dark:border-sky-900/30 dark:bg-[#071628]/40 dark:hover:bg-[#071628]/60"
                    : "border-slate-200 bg-slate-50 opacity-70 dark:border-slate-900/60 dark:bg-[#040E1C]/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "flex items-center justify-center h-8 w-8 rounded-lg border",
                    tf.isActive 
                      ? "bg-sky-50 border-sky-500/20 text-sky-600 dark:bg-indigo-500/5 dark:text-sky-400" 
                      : "bg-white dark:bg-[#071628] border-slate-200 dark:border-sky-900/30 shadow-sm text-slate-600"
                  )}>
                    <Clock size={14} className={clsx(tf.isActive && "animate-pulse")} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-bold uppercase tracking-wider text-sky-900 dark:text-slate-100">
                      {tf.name}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      {tf.minutes >= 1440 
                        ? `${tf.minutes / 1440} Day(s)` 
                        : tf.minutes >= 60 
                          ? `${tf.minutes / 60} Hour(s)` 
                          : `${tf.minutes} Minute(s)`
                      } ({tf.minutes}m)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={clsx(
                    "text-[9px] font-bold uppercase tracking-widest",
                    tf.isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-600"
                  )}>
                    {tf.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                  <Toggle
                    checked={tf.isActive}
                    onChange={() => {
                      requireConfirmation({
                        title: 'Confirm Timeframe Toggle',
                        message: `You are about to toggle the ingestion aggregation for ${tf.name}.`,
                        actionLabel: 'Toggle Timeframe',
                        onConfirm: () => mutActive.mutate(tf.id)
                      })
                    }}
                    disabled={mutActive.isPending}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const col = createColumnHelper<Instrument>()

export default function InstrumentsPage() {
  const qc = useQueryClient()
  const { requireConfirmation } = useSecureConfirm()
  const [showForm, setShowForm] = useState(false)
  const [showTimeframes, setShowTimeframes] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const { data, isLoading, isError } = useQuery({
    queryKey: ['instruments'],
    queryFn: api.instruments.list,
  })

  const mutActive = useMutation({
    mutationFn: api.instruments.toggleActive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instruments'] }),
  })
  const mutPause = useMutation({
    mutationFn: api.instruments.togglePause,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instruments'] }),
  })
  const mutBulkActive = useMutation({
    mutationFn: ({ ids, value }: { ids: string[]; value: boolean }) => api.instruments.bulkSetActive(ids, value),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['instruments'] }); setRowSelection({}) },
  })
  const mutBulkPause = useMutation({
    mutationFn: ({ ids, value }: { ids: string[]; value: boolean }) => api.instruments.bulkSetPause(ids, value),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['instruments'] }); setRowSelection({}) },
  })

  const selectedIds = Object.keys(rowSelection)

  const columns = [
    col.display({
      id: 'select',
      enableSorting: false,
      header: ({ table }) => (
        <label
          className="flex cursor-pointer items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <IndeterminateCheckbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        </label>
      ),
      cell: ({ row }) => (
        <label
          className="flex cursor-pointer items-center justify-center -mx-4 -my-3 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <IndeterminateCheckbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        </label>
      ),
    }),
    col.accessor('name', {
      header: 'Symbol',
      cell: (i) => <span className="font-mono text-sm font-bold uppercase tracking-wide text-sky-900 dark:text-slate-100">{i.getValue()}</span>,
    }),
    col.accessor('description', {
      header: 'Description',
      cell: (i) => <span className="text-xs font-medium text-slate-600 dark:text-slate-500">{i.getValue() ?? <span className="text-slate-600">—</span>}</span>,
    }),
    col.accessor('assetClass', {
      header: 'Asset Class',
      cell: (i) => {
        const v = i.getValue()
        return v
          ? <span className="rounded-md border border-sky-200/70 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm dark:border-sky-900/30 dark:bg-[#071628]/60 dark:text-slate-500">{v}</span>
          : <span className="text-slate-600">—</span>
      },
    }),
    col.accessor('divider', {
      header: 'Divider',
      cell: (i) => {
        const v = i.getValue()
        return v !== null
          ? <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{v.toLocaleString()}</span>
          : <span className="text-slate-600">—</span>
      },
    }),
    col.accessor('startDate', {
      header: 'Start Date',
      cell: (i) => {
        const v = i.getValue()
        return v
          ? <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{new Date(v).toLocaleDateString()}</span>
          : <span className="text-slate-600">—</span>
      },
    }),
    col.accessor('isActive', {
      header: 'Active Status',
      cell: (i) => (
        <div className="flex items-center gap-3">
          <Toggle
            checked={i.getValue()}
            onChange={() => {
              requireConfirmation({
                title: 'Confirm Status Change',
                message: 'You are about to change the active status of this instrument.',
                actionLabel: 'Change Status',
                onConfirm: () => mutActive.mutate(i.row.original.id)
              })
            }}
            disabled={mutActive.isPending}
          />
          <span className={clsx('text-[10px] font-bold uppercase tracking-wider', i.getValue() ? 'text-sky-600 dark:text-sky-400' : 'text-slate-600')}>
            {i.getValue() ? 'Online' : 'Offline'}
          </span>
        </div>
      ),
    }),
    col.accessor('isPause', {
      header: 'Ingestion State',
      cell: (i) => (
        <div className="flex items-center gap-3">
          <Toggle
            checked={i.getValue()}
            onChange={() => {
              requireConfirmation({
                title: 'Confirm Ingestion Pause',
                message: 'You are about to pause or resume the background ingestion task for this instrument.',
                actionLabel: 'Confirm Change',
                onConfirm: () => mutPause.mutate(i.row.original.id)
              })
            }}
            disabled={mutPause.isPending}
          />
          <span className="flex items-center gap-1.5">
            <span className={clsx('text-[10px] font-bold uppercase tracking-wider', i.getValue() ? 'text-amber-500' : 'text-emerald-400')}>
              {i.getValue() ? 'Paused' : 'Running'}
            </span>
            {i.getValue() && <PauseCircle size={13} className="text-amber-500 animate-pulse" />}
          </span>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      {/* Header Controls */}
      <div className="flex flex-shrink-0 items-center justify-between gap-3 rounded-xl border border-sky-200/70 bg-white/90 p-3.5 shadow-sm dark:border-sky-900/30 dark:bg-[#111520]">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            className="w-full rounded-lg border border-sky-200/70 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-500/80 dark:border-sky-900/30 dark:bg-[#040E1C] dark:text-slate-300 dark:placeholder:text-slate-700"
            placeholder="Filter by Symbol..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden md:inline">{data?.length ?? 0} Instruments Total</span>
          
          <button
            onClick={() => {
              setShowTimeframes((p) => !p)
              setShowForm(false)
            }}
            className={clsx(
              "interactive-element flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold transition-all shadow-sm",
              showTimeframes
                ? "border-sky-300 bg-sky-100/80 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-slate-700 dark:bg-sky-900/30 dark:text-sky-400"
                : "border-sky-200/70 bg-white text-slate-700 shadow-sm hover:bg-sky-50 hover:text-sky-800 dark:border-sky-900/30 dark:bg-[#071628] dark:text-slate-300 dark:hover:bg-sky-900/30 dark:hover:text-slate-100"
            )}
          >
            <Sliders size={13} />
            MANAGE TIMEFRAMES
          </button>

          <button
            onClick={() => {
              setShowForm((p) => !p)
              setShowTimeframes(false)
            }}
            className={clsx(
              "interactive-element flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(79,70,229,0.25)] transition-all",
              showForm ? "bg-sky-500" : "bg-sky-600 hover:bg-sky-500"
            )}
          >
            <Plus size={14} strokeWidth={2.5} />
            ADD INSTRUMENT
          </button>
        </div>
      </div>

      {/* Main Grid Body */}
      <div className="flex min-h-0 flex-1 gap-4">
        <Card className="min-w-0 flex-1 border-sky-200/70 bg-white/90 dark:border-sky-900/30 dark:bg-[#111520]" noPadding scrollable>
          {isLoading && <TableSkeleton cols={7} rows={8} />}
          {isError && <EmptyState title="Loading failed" message="An error occurred while fetching currency instruments." icon={Ban} />}
          {!isLoading && !isError && data && data.length === 0 && <EmptyState title="No instruments registered" message="Register a currency symbol to start data ingestion." />}
          {!isLoading && !isError && data && data.length > 0 && (
            <div className="h-full w-full overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 border-b border-sky-200/70 bg-sky-50/95 shadow-sm backdrop-blur-md dark:border-sky-900/30 dark:bg-[#040E1C]/90">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <th
                          key={header.id}
                          className={clsx(
                            "px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors dark:text-slate-500",
                            header.column.getCanSort() && "cursor-pointer select-none hover:text-sky-700 dark:hover:text-slate-300"
                          )}
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span className="font-mono font-medium text-sky-600 dark:text-sky-400">
                              {header.column.getIsSorted() === 'asc' ? ' ▲' : header.column.getIsSorted() === 'desc' ? ' ▼' : ''}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-sky-100 dark:divide-slate-800/40">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="interactive-element group border-b border-sky-100 transition-colors duration-150 hover:bg-sky-50/80 dark:border-sky-900/30 dark:hover:bg-sky-900/20">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {showForm && <AddForm onClose={() => setShowForm(false)} />}
        {showTimeframes && <TimeframePanel onClose={() => setShowTimeframes(false)} />}
      </div>

      {/* ─── Bulk Action Bar ──────────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl border border-sky-200/80 bg-white/95 px-5 py-3 shadow-2xl shadow-sky-900/10 backdrop-blur-md dark:border-sky-900/50 dark:bg-[#0d1b2e]/95">
          {/* Selection count */}
          <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap">
            {selectedIds.length} selected
          </span>
          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Active group */}
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Active</span>
          <button
            onClick={() => requireConfirmation({
              title: 'Activate Selected Instruments',
              message: `You are about to set ${selectedIds.length} instrument(s) to Active (Online). This will enable their ingestion pipelines.`,
              actionLabel: 'Activate',
              onConfirm: () => mutBulkActive.mutate({ ids: selectedIds, value: true }),
            })}
            disabled={mutBulkActive.isPending || mutBulkPause.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50 transition-colors"
          >
            <Power size={11} />
            Online
          </button>
          <button
            onClick={() => requireConfirmation({
              title: 'Deactivate Selected Instruments',
              message: `You are about to set ${selectedIds.length} instrument(s) to Inactive (Offline). This will disable their ingestion pipelines.`,
              actionLabel: 'Deactivate',
              onConfirm: () => mutBulkActive.mutate({ ids: selectedIds, value: false }),
            })}
            disabled={mutBulkActive.isPending || mutBulkPause.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors dark:border-sky-900/40 dark:bg-[#071628] dark:text-slate-400 dark:hover:bg-sky-900/20"
          >
            <Ban size={11} />
            Offline
          </button>

          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Ingestion group */}
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Ingestion</span>
          <button
            onClick={() => requireConfirmation({
              title: 'Resume Ingestion for Selected',
              message: `You are about to resume background ingestion for ${selectedIds.length} instrument(s).`,
              actionLabel: 'Resume',
              onConfirm: () => mutBulkPause.mutate({ ids: selectedIds, value: false }),
            })}
            disabled={mutBulkActive.isPending || mutBulkPause.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            <Play size={11} />
            Resume
          </button>
          <button
            onClick={() => requireConfirmation({
              title: 'Pause Ingestion for Selected',
              message: `You are about to pause background ingestion for ${selectedIds.length} instrument(s).`,
              actionLabel: 'Pause',
              onConfirm: () => mutBulkPause.mutate({ ids: selectedIds, value: true }),
            })}
            disabled={mutBulkActive.isPending || mutBulkPause.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            <PauseCircle size={11} />
            Pause
          </button>

          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Clear selection */}
          <button
            onClick={() => setRowSelection({})}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400"
            title="Clear selection"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
