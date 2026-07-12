import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import NotificationPanel from './NotificationPanel'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useState } from 'react'

export default function AppShell() {
  const { status } = useWebSocket()
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasUnread] = useState(false)

  return (
    <div className="h-full w-full overflow-hidden bg-slate-100 dark:bg-[#01040A]">
      <div
        className="geonera-page grid h-full w-full overflow-hidden rounded-xl border border-sky-300/50 shadow-[0_20px_60px_rgba(2,132,199,0.15)] dark:border-sky-700/50 dark:shadow-[0_0_80px_rgba(14,165,233,0.1)]"
        style={{
          gridTemplateAreas: '"topbar topbar" "sidebar main"',
          gridTemplateRows: '40px 1fr',
          gridTemplateColumns: '160px 1fr',
        }}
      >
        <header style={{ gridArea: 'topbar' }}>
          <Topbar
            wsStatus={status}
            onToggleNotifications={() => setShowNotifications((p) => !p)}
            hasUnreadNotifications={hasUnread}
          />
        </header>

        <aside
          style={{ gridArea: 'sidebar' }}
          className="overflow-hidden border-r border-sky-200/60 dark:border-sky-900/30"
        >
          <Sidebar />
        </aside>

        <main style={{ gridArea: 'main' }} className="overflow-hidden relative">
          <Outlet />
        </main>

        {showNotifications && (
          <NotificationPanel onClose={() => setShowNotifications(false)} />
        )}
      </div>
    </div>
  )
}
