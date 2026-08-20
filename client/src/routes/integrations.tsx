import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Puzzle } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { ServerInstance } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { InstalledMods } from '@/components/integrations/installed-mods'
import { ModSearch } from '@/components/integrations/mod-search'
import { PlayitPanel } from '@/components/integrations/playit-panel'

export function IntegrationsPage() {
  const [selectedServerId, setSelectedServerId] = useState('')

  const serversQuery = useQuery({
    queryKey: ['servers'],
    queryFn: () => apiFetch<ServerInstance[]>('/api/servers'),
  })

  if (serversQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Intégrations</h1>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  if (serversQuery.isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Intégrations</h1>
        <p role="alert" className="text-sm text-red-600">
          {(serversQuery.error as Error).message}
        </p>
      </div>
    )
  }

  const servers = serversQuery.data ?? []
  const activeId = selectedServerId || servers[0]?.id || ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Intégrations</h1>
        <div className="w-64">
          {servers.length > 1 ? (
            <Select
              aria-label="Serveur"
              value={activeId}
              onChange={(e) => setSelectedServerId(e.target.value)}
            >
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="h-5 w-5 text-primary" />
              Aucun serveur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Crée un serveur sur l'onglet Serveurs pour installer des mods et configurer un tunnel
            Playit.
          </CardContent>
        </Card>
      ) : (
        <>
          <ModSearch key={`mods-${activeId}`} serverId={activeId} />
          <InstalledMods key={`installed-${activeId}`} serverId={activeId} />
          <PlayitPanel key={`playit-${activeId}`} serverId={activeId} />
        </>
      )}
    </div>
  )
}

export default IntegrationsPage