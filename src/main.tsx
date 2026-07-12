import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App'
import './index.css'

import { SecureConfirmProvider } from './components/ui/SecureConfirmModal'
import ViewportScaler from './components/layout/ViewportScaler'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SecureConfirmProvider>
        <ViewportScaler>
          <App />
        </ViewportScaler>
      </SecureConfirmProvider>
    </QueryClientProvider>
  </StrictMode>
)
