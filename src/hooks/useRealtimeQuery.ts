import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { wsEvents } from '@/lib/wsEvents'

/**
 * Drop-in replacement for useQuery that receives live data via WebSocket.
 * - Runs the queryFn once on mount for an immediate initial value.
 * - Cache is updated directly from WS events for low-latency updates.
 * - Falls back to 30-second REST polling when WS is not delivering events
 *   (e.g. connection dropped, proxy timeout, broker restart).
 * - Invalidates this query whenever the WS reconnects so stale data
 *   accumulated during a disconnect is immediately replaced.
 */
export function useRealtimeQuery<TData>(
  wsEventType: string,
  options: UseQueryOptions<TData>,
) {
  const queryClient = useQueryClient()
  const keyRef = useRef(options.queryKey)
  keyRef.current = options.queryKey

  // Live update: WS event pushes fresh data directly into the cache.
  useEffect(() => {
    return wsEvents.on(wsEventType, (data) => {
      queryClient.setQueryData(keyRef.current!, data as TData)
    })
  }, [wsEventType, queryClient])

  // Reconnect recovery: when WS (re)connects, invalidate so any data that
  // changed while the socket was down is fetched fresh via queryFn.
  useEffect(() => {
    return wsEvents.on('ws:connected', () => {
      queryClient.invalidateQueries({ queryKey: keyRef.current! })
    })
  }, [queryClient])

  return useQuery<TData>({
    ...options,
    // 30-second fallback polling ensures the dashboard stays current even
    // when WS events are not arriving (e.g. proxy drops the upgrade).
    // When WS is healthy, setQueryData above delivers updates immediately
    // and the 30-second timer fires as a harmless background confirmation.
    refetchInterval: 30_000,
    staleTime: Infinity,
  })
}
