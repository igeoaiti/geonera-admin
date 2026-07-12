import { X, Bell, CheckCircle2 } from 'lucide-react'

interface NotificationPanelProps {
  onClose: () => void
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 border-l border-sky-200/60 bg-white/95 shadow-2xl backdrop-blur-md dark:border-sky-900/30 dark:bg-[#04101E]/95 animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="flex items-center justify-between border-b border-sky-200/60 p-4 dark:border-sky-900/30">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-100">
            <Bell size={16} />
            <h3 className="font-bold tracking-wide">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-slate-800 dark:hover:text-sky-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-center text-slate-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900/80">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">You have no new notifications.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
