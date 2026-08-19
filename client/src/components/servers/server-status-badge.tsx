import type { ServerStatus } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

const STATUS_VARIANTS: Record<ServerStatus, { label: string; variant: 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  stopped: { label: 'Arrêté', variant: 'secondary' },
  running: { label: 'En ligne', variant: 'success' },
  starting: { label: 'Démarrage', variant: 'warning' },
  stopping: { label: 'Arrêt…', variant: 'warning' },
  error: { label: 'Erreur', variant: 'destructive' },
}

export function ServerStatusBadge({ status }: { status: ServerStatus }) {
  const { label, variant } = STATUS_VARIANTS[status]
  return (
    <Badge variant={variant} data-testid={`status-${status}`}>
      {label}
    </Badge>
  )
}