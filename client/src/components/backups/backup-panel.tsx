import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Download, RefreshCw } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatBytes } from '@/lib/files'
import type { Backup, BackupPolicy } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const DEFAULT_INTERVAL_MINUTES = 60
const DEFAULT_MAX_BACKUPS = 5

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function BackupPanel({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient()
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const backupsQuery = useQuery({
    queryKey: ['backups', serverId],
    queryFn: () => apiFetch<Backup[]>(`/api/servers/${serverId}/backups`),
  })

  const policyQuery = useQuery({
    queryKey: ['backup-policy', serverId],
    queryFn: async () => {
      const policy = await apiFetch<BackupPolicy>(
        `/api/servers/${serverId}/backup-policy`,
      ).catch(() => null)
      return policy ?? null
    },
  })

  const [intervalMinutes, setIntervalMinutes] = useState(DEFAULT_INTERVAL_MINUTES)
  const [maxBackups, setMaxBackups] = useState(DEFAULT_MAX_BACKUPS)

  useEffect(() => {
    if (policyQuery.data) {
      setIntervalMinutes(policyQuery.data.intervalMinutes)
      setMaxBackups(policyQuery.data.maxBackups)
    }
  }, [policyQuery.data])

  const invalidateBackups = () => queryClient.invalidateQueries({ queryKey: ['backups', serverId] })

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Backup>(`/api/servers/${serverId}/backups`, { method: 'POST' }),
    onSuccess: invalidateBackups,
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/backups/${id}/restore`, { method: 'POST' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/backups/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateBackups,
  })

  const policyMutation = useMutation({
    mutationFn: (policy: { intervalMinutes: number; maxBackups: number }) =>
      apiFetch<BackupPolicy>(`/api/servers/${serverId}/backup-policy`, {
        method: 'PATCH',
        body: policy,
      }),
    onSuccess: (policy) => queryClient.setQueryData(['backup-policy', serverId], policy),
  })

  function runWithFeedback(
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<void> {
    setActionError(null)
    setNotice(null)
    return action().then(
      () => setNotice(successMessage),
      (err: Error) => setActionError(err.message),
    )
  }

  async function handleCreate(): Promise<void> {
    await runWithFeedback(() => createMutation.mutateAsync(), 'Sauvegarde créée.')
  }

  async function handleRestore(): Promise<void> {
    if (!restoreTarget) return
    await runWithFeedback(
      () => restoreMutation.mutateAsync(restoreTarget.id),
      'Sauvegarde restaurée.',
    )
    setRestoreTarget(null)
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  async function handleSavePolicy(): Promise<void> {
    await runWithFeedback(
      () =>
        policyMutation.mutateAsync({
          intervalMinutes: Number(intervalMinutes),
          maxBackups: Number(maxBackups),
        }),
      'Politique enregistrée.',
    )
  }

  const backups = backupsQuery.data ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Archive className="h-5 w-5 text-primary" />
            Sauvegardes
            <Badge variant="secondary">
              {backups.length} sauvegarde{backups.length > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => backupsQuery.refetch()}
              aria-label="Actualiser"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer une sauvegarde'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {actionError ? (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {actionError}
            </p>
          ) : null}
          {notice ? <p className="mb-3 text-sm text-emerald-600">{notice}</p> : null}

          {backupsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : backupsQuery.isError ? (
            <p role="alert" className="text-sm text-red-600">
              {(backupsQuery.error as Error).message}
            </p>
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune sauvegarde pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">{backup.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(backup.createdAt)} · {formatBytes(backup.sizeBytes)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setRestoreTarget(backup)}>
                      <Download className="h-4 w-4" />
                      Restaurer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleteTarget(backup)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sauvegarde automatique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="policy-interval">Intervalle (minutes)</Label>
              <Input
                id="policy-interval"
                type="number"
                min={1}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <div>
              <Label htmlFor="policy-max">Sauvegardes conservées</Label>
              <Input
                id="policy-max"
                type="number"
                min={1}
                value={maxBackups}
                onChange={(e) => setMaxBackups(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <Button onClick={handleSavePolicy} disabled={policyMutation.isPending}>
              {policyMutation.isPending ? 'Enregistrement…' : 'Enregistrer la politique'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {restoreTarget ? (
        <ConfirmModal
          open={Boolean(restoreTarget)}
          title="Restaurer la sauvegarde"
          description="Les fichiers du serveur seront remplacés par ceux de cette sauvegarde."
          confirmLabel="Restaurer"
          confirmVariant="default"
          onClose={() => setRestoreTarget(null)}
          onConfirm={handleRestore}
        />
      ) : null}
      {deleteTarget ? (
        <ConfirmModal
          open={Boolean(deleteTarget)}
          title="Supprimer la sauvegarde"
          description="Cette sauvegarde sera définitivement supprimée."
          confirmLabel="Supprimer"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  )
}