import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import DashboardPage from '@/pages/Dashboard'
import InstrumentsPage from '@/pages/Instruments'
import StateMonitorPage from '@/pages/StateMonitor'
import IngestionProgressPage from '@/pages/IngestionProgress'
import ControlCenterPage from '@/pages/ControlCenter'
import ObservabilityPage from '@/pages/Observability'
export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/instruments" element={<InstrumentsPage />} />
          <Route path="/states" element={<StateMonitorPage />} />
          <Route path="/progress" element={<IngestionProgressPage />} />
          <Route path="/control" element={<ControlCenterPage />} />
          <Route path="/observability" element={<ObservabilityPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
