import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Puzzle, Search } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import {
  MOD_PROVIDER_LABELS,
  MOD_TYPE_LABELS,
  type InstallModInput,
  type ModProviderName,
  type ModSearchResult,
  type ModType,
} from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface AppliedSearch {
  provider: ModProviderName
  query: string
  type?: ModType
  gameVersion?: string
  loader?: string
}

export function ModSearch({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState<ModProviderName>('modrinth')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [gameVersion, setGameVersion] = useState('')
  const [loader, setLoader] = useState('')
  const [applied, setApplied] = useState<AppliedSearch | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const resultsQuery = useQuery({
    queryKey: ['mod-search', applied],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('query', applied!.query)
      if (applied!.type) params.set('type', applied!.type)
      if (applied!.gameVersion) params.set('gameVersion', applied!.gameVersion)
      if (applied!.loader) params.set('loader', applied!.loader)
      return apiFetch<ModSearchResult[]>(
        `/api/integrations/${applied!.provider}/search?${params.toString()}`,
      )
    },
    enabled: Boolean(applied && applied.query.length > 0),
  })

  const installMutation = useMutation({
    mutationFn: (input: InstallModInput) =>
      apiFetch<unknown>(`/api/servers/${serverId}/integrations/install`, {
        method: 'POST',
        body: input,
      }),
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

  function handleSearch(): void {
    setApplied({
      provider,
      query: query.trim(),
      type: (type as ModType) || undefined,
      gameVersion: gameVersion.trim() || undefined,
      loader: loader.trim() || undefined,
    })
  }

  function handleInstall(result: ModSearchResult): Promise<void> {
    const input: InstallModInput = {
      provider,
      projectId: result.projectId,
      type: (type as ModType) || undefined,
      gameVersion: gameVersion.trim() || undefined,
      loader: loader.trim() || undefined,
    }
    return runWithFeedback(
      () => installMutation.mutateAsync(input),
      `${result.name} installé sur le serveur.`,
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Puzzle className="h-5 w-5 text-primary" />
          Mods &amp; plugins
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <Label htmlFor="mod-provider">Fournisseur</Label>
            <Select id="mod-provider" value={provider} onChange={(e) => setProvider(e.target.value as ModProviderName)}>
              {(Object.keys(MOD_PROVIDER_LABELS) as ModProviderName[]).map((key) => (
                <option key={key} value={key}>
                  {MOD_PROVIDER_LABELS[key]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <Label htmlFor="mod-type">Type</Label>
            <Select id="mod-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Tous</option>
              {(Object.keys(MOD_TYPE_LABELS) as ModType[]).map((key) => (
                <option key={key} value={key}>
                  {MOD_TYPE_LABELS[key]}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-56 flex-1">
            <Label htmlFor="mod-query">Recherche</Label>
            <Input
              id="mod-query"
              placeholder="Nom du mod ou du plugin…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
            />
          </div>
          <div className="w-32">
            <Label htmlFor="mod-game-version">Version</Label>
            <Input
              id="mod-game-version"
              placeholder="ex. 1.20.4"
              value={gameVersion}
              onChange={(e) => setGameVersion(e.target.value)}
            />
          </div>
          <div className="w-32">
            <Label htmlFor="mod-loader">Loader</Label>
            <Input
              id="mod-loader"
              placeholder="ex. fabric"
              value={loader}
              onChange={(e) => setLoader(e.target.value)}
            />
          </div>
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4" />
            Rechercher
          </Button>
        </div>

        {actionError ? (
          <p role="alert" className="text-sm text-red-600">
            {actionError}
          </p>
        ) : null}
        {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

        {resultsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : resultsQuery.isError ? (
          <p role="alert" className="text-sm text-red-600">
            {(resultsQuery.error as Error).message}
          </p>
        ) : !applied ? (
          <p className="text-sm text-muted-foreground">
            Recherche un mod ou un plugin puis installe-le sur le serveur.
          </p>
        ) : resultsQuery.data && resultsQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun résultat.</p>
        ) : (
          <div className="space-y-2">
            {resultsQuery.data?.map((result) => (
              <div
                key={result.projectId}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {result.name}
                    <Badge variant="secondary">{result.type}</Badge>
                    {result.downloads !== undefined ? (
                      <span className="text-xs text-muted-foreground">
                        {result.downloads.toLocaleString('fr-FR')} téléchargements
                      </span>
                    ) : null}
                  </p>
                  {result.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {result.description}
                    </p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleInstall(result)}
                  disabled={installMutation.isPending}
                >
                  {installMutation.isPending ? 'Installation…' : 'Installer'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}