import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FolderOpen } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { ServerInstance } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { FileBrowser } from '@/components/files/file-browser'

export function FilesPage() {
  const [selectedServerId, setSelectedServerId] = useState('')

  const serversQuery = useQuery({
    queryKey: ['servers'],
    queryFn: () => apiFetch<ServerInstance[]>('/api/servers'),
  })

  if (serversQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Fichiers</h1>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  if (serversQuery.isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Fichiers</h1>
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
        <h1 className="text-2xl font-bold">Fichiers</h1>
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
              <FolderOpen className="h-5 w-5 text-primary" />
              Aucun serveur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Crée un serveur sur l'onglet Serveurs pour gérer ses fichiers.
          </CardContent>
        </Card>
      ) : (
        <FileBrowser key={activeId} serverId={activeId} />
      )}
    </div>
  )
}

export default FilesPage