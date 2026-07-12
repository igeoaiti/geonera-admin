import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={clsx('animate-pulse rounded-md bg-sky-50 dark:bg-[#030C18]/60', className)} />
  )
}

export function KpiCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-sky-900/30 bg-white dark:bg-[#071628] px-5 py-4">
      <Skeleton className="h-10 w-10 flex-shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-2.5 w-32" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center space-x-4 border-t border-slate-200 dark:border-sky-900/40 pt-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={clsx(
                'h-3.5 flex-1',
                colIndex === 0 && 'w-1/4 flex-none',
                colIndex === cols - 1 && 'w-1/6 flex-none'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="flex h-full w-full flex-col justify-between p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="flex items-end justify-between space-x-2 pt-6 flex-1 min-h-[120px]">
        <Skeleton className="h-[20%] flex-1" />
        <Skeleton className="h-[50%] flex-1" />
        <Skeleton className="h-[80%] flex-1" />
        <Skeleton className="h-[40%] flex-1" />
        <Skeleton className="h-[90%] flex-1" />
        <Skeleton className="h-[30%] flex-1" />
        <Skeleton className="h-[70%] flex-1" />
      </div>
    </div>
  )
}
