import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout(): Promise<void> {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
      <h1 className="text-sm font-medium text-muted-foreground md:hidden">Nutty Panel</h1>
      <div className="ml-auto flex items-center gap-2">
        {user ? <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span> : null}
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Se déconnecter" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}