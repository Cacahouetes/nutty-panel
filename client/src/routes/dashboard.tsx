import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, RefreshCw, Server } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { SERVER_TYPE_LABELS, type ServerInstance } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ServerStatusBadge } from '@/components/servers/server-status-badge'

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const serversQuery = useQuery({
    queryKey: ['servers'],
    queryFn: () => apiFetch<ServerInstance[]>('/api/servers'),
  })

  if (serversQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-4 w-24" />
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
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
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
  const running = servers.filter((s) => s.status === 'running').length
  const stopped = servers.filter((s) => s.status === 'stopped').length
  const errors = servers.filter((s) => s.status === 'error').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <Link to="/servers" className={buttonVariants({})}>
          Gérer les serveurs
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Serveurs" value={servers.length} />
        <StatCard label="En ligne" value={running} />
        <StatCard label="Arrêtés" value={stopped} />
        <StatCard label="En erreur" value={errors} />
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6 text-sm text-muted-foreground">
            <p>Aucun serveur pour le moment.</p>
            <Link to="/servers" className={buttonVariants({})}>Créer un serveur</Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Vos serveurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {servers.map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{server.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {SERVER_TYPE_LABELS[server.type]} · MC {server.version}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant="outline">Port {server.port}</Badge>
                  <ServerStatusBadge status={server.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DashboardPage