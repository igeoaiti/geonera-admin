import { NavLink } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Cpu,
  LayoutDashboard,
  Settings2,
  TrendingUp,
  LineChart,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV = [
  { to: '/dashboard',    label: 'Dashboard',         icon: LayoutDashboard },
  { to: '/instruments',  label: 'Instruments',        icon: Settings2 },
  { to: '/states',       label: 'State Monitor',      icon: Activity },
  { to: '/progress',     label: 'Ingestion Progress', icon: TrendingUp },
  { to: '/control',      label: 'Control Center',     icon: Cpu },
]

export default function Sidebar() {
  return (
    <div className="flex h-full w-full flex-col relative z-20 bg-sky-100/80 dark:bg-[#040F1E]">

      {/* Logo */}
      <div className="flex h-16 flex-shrink-0 items-center gap-2.5 border-b border-sky-200/50 dark:border-sky-900/20 bg-sky-50/45 dark:bg-sky-500/[0.04] px-3.5">
        <div className="relative flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden group"
          style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', boxShadow: '0 0 16px rgba(14,165,233,0.15)' }}>
          <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
            style={{ background: 'rgba(14,165,233,0.2)' }} />
          <BarChart3 size={16} className="text-sky-600 dark:text-sky-400 relative z-10" style={{ filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.6))' }} />
        </div>
        <div className="leading-tight">
          <p className="text-[12px] font-bold tracking-wide text-sky-950 dark:text-sky-50 uppercase">Geonera</p>
          <p className="text-[9px] font-medium tracking-widest uppercase" style={{ color: 'rgba(56,189,248,0.7)' }}>Cockpit</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-300 ease-out overflow-hidden',
                    isActive
                      ? 'text-sky-800 dark:text-sky-300'
                      : 'text-sky-900/85 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-200'
                  )
                }
                style={({ isActive }) => isActive ? {
                  background: 'rgba(14,165,233,0.12)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.36)',
                  border: '1px solid rgba(14,165,233,0.18)',
                } : {
                  border: '1px solid transparent',
                }}
              >
                {({ isActive }) => (
                  <>
                    {/* Active left bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-3/4 w-[3px] -translate-y-1/2 rounded-r-full"
                        style={{ background: 'linear-gradient(to bottom, #38BDF8, #0EA5E9)', boxShadow: '0 0 10px rgba(56,189,248,0.8)' }} />
                    )}

                    {/* Hover shimmer */}
                    {!isActive && (
                      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.04), transparent)' }} />
                    )}

                    <Icon
                      size={15}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={clsx(
                        'relative z-10 transition-all duration-300',
                        isActive ? 'text-sky-600 dark:text-sky-400' : 'text-sky-700/90 dark:text-sky-800 group-hover:text-sky-500 group-hover:scale-110'
                      )}
                      style={isActive ? { filter: 'drop-shadow(0 0 4px rgba(56,189,248,0.6))' } : {}}
                    />
                    <span className="relative z-10 truncate tracking-wide">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-sky-200/50 dark:border-sky-900/20 px-3.5 py-3.5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
            style={{ boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
          <p className="text-[9px] font-bold tracking-widest uppercase text-sky-800 dark:text-sky-400/50">System Online</p>
        </div>
        <p className="text-[9px] font-mono text-sky-700/75 dark:text-sky-500/20">v1.0.0-rc.4</p>
      </div>
    </div>
  )
}
