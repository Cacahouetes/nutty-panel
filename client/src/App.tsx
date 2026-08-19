import { Routes, Route } from 'react-router-dom'
import { DashboardPage } from '@/routes/dashboard'
import { LoginPage } from '@/routes/login'
import { NotFoundPage } from '@/routes/not-found'

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App