import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { PlayitTunnel } from '@/lib/types'

export function ServerPlayitTunnel({ serverId }: { serverId: string }) {
  const query = useQuery({
    queryKey: ['playit-tunnel', serverId],
    queryFn: () => apiFetch<PlayitTunnel>(`/api/playit/servers/${serverId}/tunnels`),
  })

  if (query.isLoading) {
    return <div className="text-sm text-muted-foreground">Playit : …</div>
  }
  if (query.isError || !query.data) {
    return <div className="text-sm text-muted-foreground">Playit : —</div>
  }

  return (
    <div className="text-sm" data-testid="server-playit-tunnel">
      <span className="text-muted-foreground">Playit : </span>
      <span className="font-mono">
        {query.data.host}:{query.data.port}
      </span>
    </div>
  )
}