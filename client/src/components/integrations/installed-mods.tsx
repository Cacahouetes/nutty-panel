import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { MOD_PROVIDER_LABELS, type InstalledMod } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Skeleton } from '@/components/ui/skeleton'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function InstalledMods({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient()
  const [uninstallTarget, setUninstallTarget] = useState<InstalledMod | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const installedQuery = useQuery({
    queryKey: ['installed-mods', serverId],
    queryFn: () => apiFetch<InstalledMod[]>(`/api/servers/${serverId}/integrations/installed`),
  })

  const uninstallMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/integrations/installed/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installed-mods', serverId] }),
  })

  function runWithFeedback(action: () => Promise<unknown>, successMessage: string): Promise<void> {
    setActionError(null)
    setNotice(null)
    return action().then(
      () => setNotice(successMessage),
      (err: Error) => setActionError(err.message),
    )
  }

  async function handleUninstall(): Promise<void> {
    if (!uninstallTarget) return
    await runWithFeedback(
      () => uninstallMutation.mutateAsync(uninstallTarget.id),
      `${uninstallTarget.projectName} désinstallé.`,
    )
    setUninstallTarget(null)
  }

  const installed = installedQuery.data ?? []

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-5 w-5 text-primary" />
          Installés sur le serveur
          <Badge variant="secondary">
            {installed.length} élément{installed.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actionError ? (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {actionError}
          </p>
        ) : null}
        {notice ? <p className="mb-3 text-sm text-emerald-600">{notice}</p> : null}

        {installedQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : installedQuery.isError ? (
          <p role="alert" className="text-sm text-red-600">
            {(installedQuery.error as Error).message}
          </p>
        ) : installed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun mod ou plugin installé sur ce serveur.
          </p>
        ) : (
          <div className="space-y-2">
            {installed.map((mod) => (
              <div key={mod.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{mod.projectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {MOD_PROVIDER_LABELS[mod.provider]} · {mod.fileName} ·{' '}
                    {formatDateTime(mod.installedAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUninstallTarget(mod)}
                  disabled={uninstallMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  Désinstaller
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {uninstallTarget ? (
        <ConfirmModal
          open={Boolean(uninstallTarget)}
          title="Désinstaller"
          description={`Le fichier ${uninstallTarget.fileName} sera retiré du serveur.`}
          confirmLabel="Désinstaller"
          onClose={() => setUninstallTarget(null)}
          onConfirm={handleUninstall}
        />
      ) : null}
    </Card>
  )
}