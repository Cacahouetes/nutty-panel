import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Play, Plus, RefreshCw, RotateCw, Square, Trash2, XCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import {
  SERVER_TYPE_LABELS,
  type CreateServerInput,
  type ServerInstance,
  type ServerStatus,
  type UpdateServerInput,
} from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ServerAutoStart } from '@/components/servers/server-auto-start'
import { ServerCreateModal } from '@/components/servers/server-create-modal'
import { ServerDeleteModal } from '@/components/servers/server-delete-modal'
import { ServerEditModal } from '@/components/servers/server-edit-modal'
import { ServerMetrics } from '@/components/servers/server-metrics'
import { ServerPlayitTunnel } from '@/components/servers/server-playit-tunnel'
import { ServerStatusBadge } from '@/components/servers/server-status-badge'

const ACTIVE_STATUSES: readonly ServerStatus[] = ['starting', 'running', 'stopping']

export function ServersPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ServerInstance | null>(null)
  const [deleting, setDeleting] = useState<ServerInstance | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const serversQuery = useQuery({
    queryKey: ['servers'],
    queryFn: () => apiFetch<ServerInstance[]>('/api/servers'),
  })

  const invalidateServers = () => queryClient.invalidateQueries({ queryKey: ['servers'] })

  const createMutation = useMutation({
    mutationFn: (input: CreateServerInput) =>
      apiFetch<ServerInstance>('/api/servers', { method: 'POST', body: input }),
    onSuccess: invalidateServers,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateServerInput }) =>
      apiFetch<ServerInstance>(`/api/servers/${id}`, { method: 'PATCH', body: input }),
    onSuccess: invalidateServers,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/servers/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateServers,
  })

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

  const restartMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<ServerInstance>(`/api/servers/${id}/restart`, { method: 'POST' }),
    onSuccess: invalidateServers,
  })

  const killMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<ServerInstance>(`/api/servers/${id}/kill`, { method: 'POST' }),
    onSuccess: invalidateServers,
  })

  const lifecycleMutations = [startMutation, stopMutation, restartMutation, killMutation]
  const mutating = lifecycleMutations.some((m) => m.isPending)

  async function runLifecycle(mutation: (typeof startMutation)['mutateAsync'], id: string): Promise<void> {
    setActionError(null)
    try {
      await mutation(id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action impossible')
    }
  }

  async function handleCreate(input: CreateServerInput): Promise<void> {
    await createMutation.mutateAsync(input)
    setCreateOpen(false)
  }

  async function handleEdit(input: UpdateServerInput): Promise<void> {
    if (!editing) return
    await updateMutation.mutateAsync({ id: editing.id, input })
    setEditing(null)
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    await deleteMutation.mutateAsync(deleting.id)
    setDeleting(null)
  }

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
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {servers.length} serveur{servers.length > 1 ? 's' : ''}
          </Badge>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau serveur
          </Button>
        </div>
      </div>

      {actionError ? (
        <p role="alert" className="text-sm text-red-600">
          {actionError}
        </p>
      ) : null}

      {servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6 text-sm text-muted-foreground">
            <p>Aucun serveur pour le moment.</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Créer un serveur
            </Button>
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
                  <Badge variant="outline">{SERVER_TYPE_LABELS[server.type]}</Badge>
                  <Badge variant="outline">MC {server.version}</Badge>
                  <Badge variant="outline">Port {server.port}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {server.memoryMb} Mo · {server.cpuPercent} % CPU
                </div>
                <ServerMetrics serverId={server.id} enabled={server.status === 'running'} />
                <ServerAutoStart serverId={server.id} />
                <ServerPlayitTunnel serverId={server.id} />
                <div className="flex flex-wrap gap-2">
                  {server.status === 'stopped' || server.status === 'error' ? (
                    <Button
                      size="sm"
                      disabled={mutating}
                      onClick={() => runLifecycle(startMutation.mutateAsync, server.id)}
                    >
                      <Play className="h-4 w-4" />
                      Démarrer
                    </Button>
                  ) : null}
                  {server.status === 'running' ? (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={mutating}
                        onClick={() => runLifecycle(stopMutation.mutateAsync, server.id)}
                      >
                        <Square className="h-4 w-4" />
                        Arrêter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mutating}
                        onClick={() => runLifecycle(restartMutation.mutateAsync, server.id)}
                      >
                        <RotateCw className="h-4 w-4" />
                        Redémarrer
                      </Button>
                    </>
                  ) : null}
                  {ACTIVE_STATUSES.includes(server.status) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mutating}
                      onClick={() => runLifecycle(killMutation.mutateAsync, server.id)}
                    >
                      <XCircle className="h-4 w-4" />
                      Forcer
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(server)}
                  >
                    <Pencil className="h-4 w-4" />
                    Éditer
                  </Button>
                  {server.status === 'stopped' || server.status === 'error' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleting(server)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServerCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      {editing ? (
        <ServerEditModal
          key={editing.id}
          server={editing}
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          onSubmit={handleEdit}
        />
      ) : null}
      {deleting ? (
        <ServerDeleteModal
          key={deleting.id}
          server={deleting}
          open={Boolean(deleting)}
          onClose={() => setDeleting(null)}
          onSubmit={handleDelete}
        />
      ) : null}
    </div>
  )
}

export default ServersPage