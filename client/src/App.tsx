import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { RequireAuth } from '@/components/auth/require-auth'
import { DashboardPage } from '@/routes/dashboard'
import { LoginPage } from '@/routes/login'
import { NotFoundPage } from '@/routes/not-found'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App