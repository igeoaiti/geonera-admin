import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,   // WS events update the cache; no stale-based refetch
      refetchInterval: false,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})
