import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, RefreshCw, Square } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { ServerInstance } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ServerStatusBadge } from '@/components/servers/server-status-badge'
import { ServerMetrics } from '@/components/servers/server-metrics'
import { ServerAutoStart } from '@/components/servers/server-auto-start'

const TYPE_LABELS: Record<ServerInstance['type'], string> = {
  vanilla: 'Vanilla',
  paper: 'Paper',
  spigot: 'Spigot',
  fabric: 'Fabric',
  forge: 'Forge',
  bedrock: 'Bedrock',
}

export function DashboardPage() {
  const queryClient = useQueryClient()

  const serversQuery = useQuery({
    queryKey: ['servers'],
    queryFn: () => apiFetch<ServerInstance[]>('/api/servers'),
  })

  const invalidateServers = () =>
    queryClient.invalidateQueries({ queryKey: ['servers'] })

  const startMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<ServerInstance>(`/api/servers/${id}/start`, { method: 'POST' }),
    onSuccess: invalidateServers,
  })

  const stopMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<ServerInstance>(`/api/servers/${id}/stop`, { method: 'POST' }),
    onSuccess: invalidateServers,
  })

  const mutating = startMutation.isPending || stopMutation.isPending

  if (serversQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Serveurs</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (serversQuery.isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Serveurs</h1>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Erreur de chargement</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              {(serversQuery.error as Error).message}
            </p>
            <Button variant="outline" onClick={() => serversQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const servers = serversQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Serveurs</h1>
        <Badge variant="secondary">{servers.length} serveur{servers.length > 1 ? 's' : ''}</Badge>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Aucun serveur pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <Card key={server.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="truncate">{server.name}</CardTitle>
                  <ServerStatusBadge status={server.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{TYPE_LABELS[server.type]}</Badge>
                  <Badge variant="outline">MC {server.version}</Badge>
                  <Badge variant="outline">Port {server.port}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {server.memoryMb} Mo · {server.cpuPercent} % CPU
                </div>
                <ServerMetrics serverId={server.id} enabled={server.status === 'running'} />
                <ServerAutoStart serverId={server.id} />
                <div className="flex gap-2">
                  {server.status === 'stopped' || server.status === 'error' ? (
                    <Button
                      size="sm"
                      disabled={mutating}
                      onClick={() => startMutation.mutate(server.id)}
                    >
                      <Play className="h-4 w-4" />
                      Démarrer
                    </Button>
                  ) : null}
                  {server.status === 'running' ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={mutating}
                      onClick={() => stopMutation.mutate(server.id)}
                    >
                      <Square className="h-4 w-4" />
                      Arrêter
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default DashboardPage