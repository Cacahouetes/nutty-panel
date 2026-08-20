import { NavLink } from 'react-router-dom'
import {
  Archive,
  Boxes,
  LayoutDashboard,
  Puzzle,
  Rocket,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to?: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  soon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/servers', label: 'Serveurs', icon: Rocket },
  { to: '/files', label: 'Fichiers', icon: Boxes },
  { label: 'Sauvegardes', icon: Archive, soon: true },
  { label: 'Intégrations', icon: Puzzle, soon: true },
  { label: 'Réglages', icon: Settings, soon: true },
]

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Rocket className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">Nutty Panel</span>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const content = (
            <>
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.soon ? (
                <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                  bientôt
                </span>
              ) : null}
            </>
          )
          return item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  isActive && 'bg-muted text-foreground',
                )
              }
            >
              {content}
            </NavLink>
          ) : (
            <span
              key={item.label}
              className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
            >
              {content}
            </span>
          )
        })}
      </nav>
    </aside>
  )
}