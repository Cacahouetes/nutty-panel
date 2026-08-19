import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '@/lib/theme'
import { Button } from '@/components/ui/button'

const NEXT_THEME: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const THEME_LABELS: Record<Theme, string> = {
  light: 'Thème clair',
  dark: 'Thème sombre',
  system: 'Thème système',
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next = NEXT_THEME[theme]

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={THEME_LABELS[theme]}
      onClick={() => setTheme(next)}
    >
      {theme === 'light' ? <Sun className="h-4 w-4" /> : null}
      {theme === 'dark' ? <Moon className="h-4 w-4" /> : null}
      {theme === 'system' ? <Monitor className="h-4 w-4" /> : null}
    </Button>
  )
}