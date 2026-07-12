import { useState, useEffect } from 'react'
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery'
import { useNavigate, useLocation } from 'react-router-dom'
import { Database, Wifi, WifiOff, Clock, Maximize, Minimize, LayoutGrid, ChevronDown, Activity, Box, Bell, Layers, Sun, Moon } from 'lucide-react'
import type { WsStatus } from '@/hooks/useWebSocket'
import { api } from '@/lib/api'
import { clsx } from 'clsx'
import { GRAFANA_URL, JAEGER_URL, PROMETHEUS_URL, RABBITMQ_URL, MINIO_URL, PORTAINER_URL } from '@/lib/env'

const getStoredTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
}

const CONNECTED_APPS = [
  {
    name: 'Geonera Cockpit',
    route: '/dashboard',
    icon: Activity,
    description: 'Main ETL Ingestion Engine',
    external: false,
  },
  {
    name: 'Portainer Infra',
    route: PORTAINER_URL,
    icon: Box,
    description: 'Docker Container Management',
    external: true,
  },
  {
    name: 'RabbitMQ Console',
    route: RABBITMQ_URL,
    icon: Layers,
    description: 'Message Broker Management',
    external: true,
  },
  {
    name: 'Grafana Dashboards',
    route: GRAFANA_URL,
    icon: LayoutGrid,
    description: 'Metrics Visualization',
    external: true,
  },
  {
    name: 'Jaeger Tracing',
    route: JAEGER_URL,
    icon: Activity,
    description: 'Distributed Tracing',
    external: true,
  },
  {
    name: 'Prometheus Queries',
    route: PROMETHEUS_URL,
    icon: Database,
    description: 'Metrics Storage & Querying',
    external: true,
  },
  {
    name: 'MinIO Console',
    route: MINIO_URL,
    icon: Database,
    description: 'Object Storage Management',
    external: true,
  },
]

interface TopbarProps {
  wsStatus: WsStatus
  onToggleNotifications: () => void
  hasUnreadNotifications: boolean
}

export default function Topbar({ wsStatus, onToggleNotifications, hasUnreadNotifications }: TopbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [time, setTime] = useState<Date>(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(getStoredTheme)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [theme])

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  const { data: health } = useRealtimeQuery('health', {
    queryKey: ['dashboard', 'health'],
    queryFn: api.dashboard.health,
  })

  const dbConnected = health?.database === 'connected'
  const wsConnected = wsStatus === 'connected'

  const utcTimeString = time.toISOString().substring(11, 19)
  const utcDateString = time.toISOString().substring(0, 10)

  const activeApp = CONNECTED_APPS.find(app => 
    !app.external && (app.route === '/dashboard'
      ? location.pathname === '/' || location.pathname === '/dashboard'
      : location.pathname.startsWith(app.route))
  ) || CONNECTED_APPS[0]

  const toggleFullscreen = () => {
    const docElm = document.documentElement as any;
    const isFS = document.fullscreenElement || docElm.webkitFullscreenElement || docElm.mozFullScreenElement || docElm.msFullscreenElement;
    
    if (!isFS) {
      const requestFS = docElm.requestFullscreen || docElm.webkitRequestFullscreen || docElm.mozRequestFullScreen || docElm.msRequestFullscreen;
      if (requestFS) {
        requestFS.call(docElm).catch((err: any) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`)
        })
      }
    } else {
      const exitFS = document.exitFullscreen || (document as any).webkitExitFullscreen || (document as any).mozCancelFullScreen || (document as any).msExitFullscreen;
      if (exitFS) {
        exitFS.call(document).catch((err: any) => {
          console.error(`Error attempting to exit fullscreen: ${err.message}`)
        })
      }
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-between border-b border-sky-200/55 dark:border-sky-900/35 bg-white/90 dark:bg-[#04101E]/95 backdrop-blur-md px-4 shadow-sm relative z-50">
      {/* Left - App Switcher Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-sky-200/65 dark:border-sky-900/35 bg-white/85 dark:bg-slate-900/80 hover:bg-sky-50 dark:hover:bg-slate-900 hover:border-sky-300/70 dark:hover:border-sky-700/60 shadow-sm transition-all duration-200 relative group text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <LayoutGrid size={12} className="text-sky-600 dark:text-sky-400 drop-shadow-[0_0_3px_rgba(56,189,248,0.5)] group-hover:scale-105 transition-transform" />
            <span className="text-[10px] font-bold tracking-wide text-slate-800 dark:text-sky-100 uppercase">
              {activeApp.name}
            </span>
          </div>
          <ChevronDown size={11} className={clsx("text-slate-400 dark:text-slate-500 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <>
            {/* Click-outside backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            <div className="absolute left-0 mt-2 w-64 rounded-xl border border-sky-200/75 dark:border-sky-900/35 bg-white/95 dark:bg-[#071628]/95 backdrop-blur-md shadow-2xl p-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 border-b border-sky-200/60 dark:border-sky-900/35 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">Connected Applications</span>
              </div>
              <div className="space-y-1">
                {CONNECTED_APPS.map((app) => {
                  const AppIcon = app.icon
                  const isSelected = activeApp.name === app.name
                  return (
                    <button
                      key={app.name}
                      onClick={() => {
                        if (app.external) {
                          window.open(app.route, '_blank')
                        } else {
                          navigate(app.route)
                        }
                        setIsOpen(false)
                      }}
                      className={clsx(
                        "w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all duration-150 group cursor-pointer",
                        isSelected
                          ? "bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300"
                          : "border border-transparent hover:bg-sky-50 dark:hover:bg-slate-900 dark:bg-slate-900/60 hover:border-sky-200/70 dark:hover:border-sky-900/40 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 dark:text-sky-100"
                      )}
                    >
                      <div className={clsx(
                        "flex items-center justify-center h-7 w-7 rounded-md border flex-shrink-0 mt-0.5",
                        isSelected
                          ? "bg-sky-500/10 border-sky-300 dark:border-sky-500/25 text-sky-600 dark:text-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.3)]"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-sky-900/30 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:text-slate-300"
                      )}>
                        <AppIcon size={13} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold leading-tight">{app.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug truncate mt-0.5">{app.description}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Center - Real-time UTC Cockpit Clock */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5 px-3 py-1 rounded-lg border border-sky-200/65 dark:border-sky-900/35 bg-white/85 dark:bg-[#071628] shadow-md">
        <div className="flex items-center gap-2">
          <Clock size={11} className="text-sky-600 dark:text-sky-400 dark:animate-pulse drop-shadow-[0_0_4px_rgba(56,189,248,0.6)]" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">SYS_TIME</span>
        </div>
        <div className="h-3 w-px bg-sky-50 dark:bg-[#030C18]" />
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums select-all tracking-wider">
            {utcDateString}
          </span>
          <span className="text-[10px] font-bold text-slate-600">UTC</span>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] tabular-nums select-all tracking-widest">
            {utcTimeString}
          </span>
        </div>
      </div>

      {/* Right — Cockpit HUD Indicators */}
      <div className="flex items-center gap-3.5">
        {/* WebSocket */}
        <div className="flex items-center gap-2 group cursor-default">
          <div className="relative flex items-center justify-center h-5 w-5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-sky-900/30 shadow-inner">
            {wsConnected ? (
            <Wifi size={10} className="text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
          ) : (
              <WifiOff size={10} className="text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
            )}
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none mb-0.5">Stream</span>
            <span
              className={clsx(
                'text-[10px] font-mono font-semibold uppercase tracking-wider leading-none transition-colors',
                wsConnected ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {wsStatus === 'connecting' ? 'CONNECTING...' : wsConnected ? 'ACTIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-sky-50 dark:bg-[#030C18]/60" />

        {/* Database */}
        <div className="flex items-center gap-2 group cursor-default">
          <div className="relative flex items-center justify-center h-5 w-5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-sky-900/30 shadow-inner">
            <Database size={10} className={clsx(dbConnected ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]')} />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none mb-0.5">Database</span>
            <span
              className={clsx(
                'text-[10px] font-mono font-semibold uppercase tracking-wider leading-none transition-colors',
                dbConnected ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {health === undefined ? 'POLLING...' : dbConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-sky-50 dark:bg-[#030C18]/60" />

        {/* Notification Button */}
        <button
          onClick={onToggleNotifications}
          className="interactive-element flex items-center justify-center h-7 w-7 rounded-lg bg-sky-50 dark:bg-slate-900/90 border border-sky-200/65 dark:border-sky-500/35 hover:border-sky-400 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-900 shadow-inner transition-all duration-150 relative group cursor-pointer"
          title="System Logs & Alerts"
        >
          <Bell size={13} className="group-hover:scale-105 transition-transform" />
          {hasUnreadNotifications && (
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse" />
          )}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={handleToggleTheme}
          className="interactive-element flex items-center justify-center h-7 w-7 rounded-lg bg-sky-50 dark:bg-slate-900/90 border border-sky-200/65 dark:border-sky-500/35 hover:border-sky-400 text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-900 shadow-inner transition-all duration-150 relative group"
          aria-pressed={theme === 'dark'}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? (
            <Sun size={13} className="text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)] group-hover:scale-105 transition-transform" />
          ) : (
            <Moon size={13} className="text-sky-600 group-hover:scale-105 transition-transform" />
          )}
        </button>

        <div className="h-4 w-px bg-sky-50 dark:bg-[#030C18]/60" />

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="interactive-element flex items-center justify-center h-7 w-7 rounded-lg bg-sky-50 dark:bg-slate-900/90 border border-sky-200/65 dark:border-sky-500/35 hover:border-sky-400 text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-900 shadow-inner transition-all duration-150 relative group"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize size={13} className="drop-shadow-[0_0_3px_rgba(56,189,248,0.4)] text-sky-600 dark:text-sky-400" />
          ) : (
            <Maximize size={13} className="group-hover:scale-105 transition-transform" />
          )}
        </button>
      </div>
    </div>
  )
}
