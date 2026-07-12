import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  message?: string
  icon?: React.ComponentType<any>
}

export function EmptyState({
  title = 'No records found',
  message = 'There is currently no data available for this view.',
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 dark:bg-[#030C18]/40 text-slate-400 dark:text-slate-500">
        <Icon size={24} className="stroke-[1.5]" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  )
}
