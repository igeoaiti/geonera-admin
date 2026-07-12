import type { StateStatus } from '@/types'

// Theme Colors (Tailwind colors as HEX for charts, etc.)
export const COLORS = {
  emerald: '#10b981', // CONFIRMED
  teal: '#14b8a6',    // COMPLETED
  blue: '#3b82f6',    // PROCESSED
  amber: '#f59e0b',   // PENDING
  yellow: '#eab308',  // NOT_FOUND
  orange: '#f97316',  // BROKEN
  rose: '#f43f5e',    // FAILED
  red: '#ef4444',     // ABANDONED
  slate: '#64748b',   // default / unknown
}

// Map StateStatus to exact tailwind utility classes
export const STATUS_CLASSES: Record<StateStatus, { badge: string; text: string; bg: string; border: string }> = {
  CONFIRMED: {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500',
    border: 'border-emerald-500/20',
  },
  COMPLETED: {
    badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    text: 'text-teal-400',
    bg: 'bg-teal-500',
    border: 'border-teal-500/20',
  },
  PROCESSED: {
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    text: 'text-blue-400',
    bg: 'bg-blue-500',
    border: 'border-blue-500/20',
  },
  PENDING: {
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    text: 'text-amber-400',
    bg: 'bg-amber-500',
    border: 'border-amber-500/20',
  },
  NOT_FOUND: {
    badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    text: 'text-yellow-400',
    bg: 'bg-yellow-500',
    border: 'border-yellow-500/20',
  },
  FAILED: {
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    text: 'text-rose-400',
    bg: 'bg-rose-500',
    border: 'border-rose-500/20',
  },
  BROKEN: {
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    text: 'text-orange-400',
    bg: 'bg-orange-500',
    border: 'border-orange-500/20',
  },
  ABANDONED: {
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    text: 'text-red-400',
    bg: 'bg-red-500',
    border: 'border-red-500/20',
  },
}

// Map StateStatus to Hex colors
export const STATUS_COLORS: Record<StateStatus, string> = {
  CONFIRMED: COLORS.emerald,
  COMPLETED: COLORS.teal,
  PROCESSED: COLORS.blue,
  PENDING: COLORS.amber,
  NOT_FOUND: COLORS.yellow,
  FAILED: COLORS.rose,
  BROKEN: COLORS.orange,
  ABANDONED: COLORS.red,
}
