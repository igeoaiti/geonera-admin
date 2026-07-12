import { clsx } from 'clsx'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-indigo-500',
        size === 'sm' && 'h-4 w-4',
        size === 'md' && 'h-6 w-6',
        size === 'lg' && 'h-10 w-10',
        className
      )}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
      </div>
    </div>
  )
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium text-red-400">Failed to load</p>
        {message && <p className="text-xs text-slate-400 dark:text-slate-500">{message}</p>}
      </div>
    </div>
  )
}
