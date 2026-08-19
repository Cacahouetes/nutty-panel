import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-4 p-8">
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}