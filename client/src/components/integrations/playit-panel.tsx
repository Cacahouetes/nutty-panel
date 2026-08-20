import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Wifi } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { PlayitStatus, PlayitTunnel } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Skeleton } from '@/components/ui/skeleton'

const AGENT_LABELS: Record<PlayitStatus['agent'], string> = {
  running: 'En cours',
  stopped: 'Arrêté',
  error: 'Erreur',
  disabled: 'Désactivé',
}

const AGENT_VARIANTS: Record<PlayitStatus['agent'], 'success' | 'secondary' | 'destructive' | 'outline'> =
  {
    running: 'success',
    stopped: 'secondary',
    error: 'destructive',
    disabled: 'outline',
  }

export function PlayitPanel({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const statusQuery = useQuery({
    queryKey: ['playit-status'],
    queryFn: () => apiFetch<PlayitStatus>('/api/playit/status'),
  })

  const tunnelQuery = useQuery({
    queryKey: ['playit-tunnel', serverId],
    queryFn: () => apiFetch<PlayitTunnel>(`/api/playit/servers/${serverId}/tunnels`),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<PlayitTunnel>(`/api/playit/servers/${serverId}/tunnels`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playit-tunnel', serverId] })
      queryClient.invalidateQueries({ queryKey: ['playit-status'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiFetch<void>(`/api/playit/servers/${serverId}/tunnels`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playit-tunnel', serverId] })
      queryClient.invalidateQueries({ queryKey: ['playit-status'] })
    },
  })

  function runWithFeedback(action: () => Promise<unknown>, successMessage: string): Promise<void> {
    setActionError(null)
    setNotice(null)
    return action().then(
      () => setNotice(successMessage),
      (err: Error) => setActionError(err.message),
    )
  }

  async function handleCreate(): Promise<void> {
    await runWithFeedback(() => createMutation.mutateAsync(), 'Tunnel Playit créé.')
  }

  async function handleDelete(): Promise<void> {
    await runWithFeedback(() => deleteMutation.mutateAsync(), 'Tunnel Playit supprimé.')
    setConfirmDelete(false)
  }

  const tunnel = tunnelQuery.data
  const status = statusQuery.data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wifi className="h-5 w-5 text-primary" />
          Tunnel Playit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Agent :</span>
          {statusQuery.isLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : status ? (
            <Badge variant={AGENT_VARIANTS[status.agent]}>{AGENT_LABELS[status.agent]}</Badge>
          ) : (
            <Badge variant="outline">Indisponible</Badge>
          )}
          {status ? (
            <span className="text-xs text-muted-foreground">{status.tunnels} tunnel(s)</span>
          ) : null}
        </div>

        {actionError ? (
          <p role="alert" className="text-sm text-red-600">
            {actionError}
          </p>
        ) : null}
        {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

        <div className="rounded-md border p-3">
          {tunnelQuery.isLoading ? (
            <Skeleton className="h-5 w-full" />
          ) : tunnelQuery.isError ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Aucun tunnel pour ce serveur.</p>
              <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Création…' : 'Créer un tunnel'}
              </Button>
            </div>
          ) : tunnel ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm">
                  {tunnel.host}:{tunnel.port}
                </p>
                <p className="text-xs text-muted-foreground">Tunnel {tunnel.tunnelId}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>

      {confirmDelete ? (
        <ConfirmModal
          open={confirmDelete}
          title="Supprimer le tunnel"
          description="Le tunnel Playit de ce serveur sera supprimé."
          confirmLabel="Supprimer"
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      ) : null}
    </Card>
  )
}