import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { PORTAINER_URL } from '@/lib/env'

export default function PortainerPage() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="flex h-full flex-col overflow-hidden p-5">
      <Card
        className="flex-1 min-h-0 flex flex-col bg-[#0B0F19] border-slate-200 dark:border-sky-900/30/80 shadow-2xl relative overflow-hidden"
        bodyClassName="flex-1 min-h-0 flex flex-col"
        noPadding
      >
        <div className="flex-grow relative min-h-0 w-full bg-[#0A0D14]">
          {/* Skeleton Loader */}
          {!isLoaded && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0A0D14]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
              <div className="mt-4 flex flex-col items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 drop-shadow-[0_0_4px_rgba(129,140,248,0.4)] animate-pulse">
                  Connecting to Portainer Engine
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  UPLINK: {PORTAINER_URL}
                </span>
              </div>
            </div>
          )}

          {/* Iframe */}
          <iframe
            src={PORTAINER_URL}
            className="h-full w-full border-0"
            title="Docker Container Management: Portainer"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={() => setIsLoaded(true)}
          />
        </div>
      </Card>
    </div>
  )
}
