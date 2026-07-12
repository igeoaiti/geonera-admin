import { clsx } from 'clsx'
import type { StateStatus } from '@/types'
import { STATUS_CLASSES } from '@/lib/constants'

interface StatusBadgeProps {
  status: StateStatus
  size?: 'xs' | 'sm'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const classes = STATUS_CLASSES[status] ?? {
    badge: 'bg-slate-500/10 text-slate-400 dark:text-slate-500 border-slate-500/20',
    text: 'text-slate-400 dark:text-slate-500',
    bg: 'bg-slate-500',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded border font-mono font-medium transition-all duration-200',
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        classes.badge
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', classes.bg)} />
      {status}
    </span>
  )
}

/** Heatmap cell — compact colored block */
export function StatusCell({
  status,
  count,
}: {
  status: StateStatus | null
  count?: number
}) {
  if (!status) {
    return (
      <div className="flex h-8 items-center justify-center rounded bg-slate-100 dark:bg-slate-900/30 text-[10px] text-slate-600 border border-slate-200 dark:border-sky-900/40">
        —
      </div>
    )
  }

  const classes = STATUS_CLASSES[status] ?? {
    badge: 'bg-slate-500/10 text-slate-400 dark:text-slate-500 border-slate-500/20',
    text: 'text-slate-400 dark:text-slate-500',
    bg: 'bg-slate-500',
  }

  return (
    <div
      className={clsx(
        'flex h-8 items-center justify-center gap-1.5 rounded text-[10px] font-semibold border transition-all duration-200 hover:scale-[1.02] cursor-default shadow-sm',
        classes.badge
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full shadow', classes.bg)} />
      {count !== undefined ? count.toLocaleString() : status}
    </div>
  )
}
