import { type CSSProperties, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface CardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  scrollable?: boolean
  noPadding?: boolean
  style?: CSSProperties
}

export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  scrollable = false,
  noPadding = false,
  style,
}: CardProps) {
  return (
    <div
      style={style}
      className={twMerge(
        'glow-card geonera-card flex flex-col rounded-xl',
        className
      )}
    >
      {(title || action) && (
        <div className="geonera-card-header flex flex-shrink-0 items-center justify-between border-b px-4 py-2.5 rounded-t-xl">
          <div>
            {title && <h3 className="text-xs font-semibold tracking-wide text-sky-950 dark:text-sky-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[10px] leading-snug text-sky-700 dark:text-sky-300/70">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div
        className={twMerge(
          clsx(
            'flex-1 min-h-0',
            scrollable && 'overflow-auto scrollbar-thin',
            !noPadding && !scrollable && 'p-3.5',
            scrollable && !noPadding && 'p-3.5'
          ),
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
