import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { AutoStartPolicy } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEFAULT_MINUTES = 30

export function ServerAutoStart({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['auto-start', serverId],
    queryFn: () => apiFetch<AutoStartPolicy>(`/api/servers/${serverId}/auto-start`),
  })

  const [enabled, setEnabled] = useState(false)
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES)

  useEffect(() => {
    if (
      query.data &&
      typeof query.data.enabled === 'boolean' &&
      typeof query.data.inactiveMinutes === 'number'
    ) {
      setEnabled(query.data.enabled)
      setMinutes(query.data.inactiveMinutes)
    }
  }, [query.data])

  const mutation = useMutation({
    mutationFn: (input: { enabled: boolean; inactiveMinutes: number }) =>
      apiFetch<AutoStartPolicy>(`/api/servers/${serverId}/auto-start`, {
        method: 'PUT',
        body: input,
      }),
    onSuccess: (policy) => {
      queryClient.setQueryData(['auto-start', serverId], policy)
    },
  })

  if (query.isLoading) {
    return <div className="text-sm text-muted-foreground">Auto : …</div>
  }
  if (query.isError || !query.data) {
    return <div className="text-sm text-muted-foreground">Auto : —</div>
  }

  return (
    <div className="space-y-2 rounded-md border p-3" data-testid="server-auto-start">
      <div className="flex items-center justify-between">
        <Label htmlFor={`auto-start-${serverId}`}>Démarrage auto</Label>
        <input
          id={`auto-start-${serverId}`}
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="h-4 w-4"
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={`auto-minutes-${serverId}`}>Inactivité (min)</Label>
          <Input
            id={`auto-minutes-${serverId}`}
            type="number"
            min={1}
            disabled={!enabled}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className="w-24"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ enabled, inactiveMinutes: minutes })}
        >
          Enregistrer
        </Button>
      </div>
      {mutation.isError ? (
        <p className="text-xs text-destructive">{(mutation.error as Error).message}</p>
      ) : null}
    </div>
  )
}
