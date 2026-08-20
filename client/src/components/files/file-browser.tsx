import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  Download,
  File,
  Folder,
  FolderPlus,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { downloadFile, formatBytes, joinPath, uploadFile } from '@/lib/files'
import type { FileEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileCreateFolderModal } from '@/components/files/file-create-folder-modal'
import { FileDeleteModal } from '@/components/files/file-delete-modal'
import { FileEditorModal } from '@/components/files/file-editor-modal'
import { FileRenameModal } from '@/components/files/file-rename-modal'

interface BreadcrumbSegment {
  label: string
  path: string
}

function buildBreadcrumbs(path: string): BreadcrumbSegment[] {
  const segments = path.split('/').filter(Boolean)
  return segments.map((label, index) => ({
    label,
    path: segments.slice(0, index + 1).join('/'),
  }))
}

export function FileBrowser({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [path, setPath] = useState('')
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null)
  const [editTarget, setEditTarget] = useState<FileEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const entriesQuery = useQuery({
    queryKey: ['files', serverId, path],
    queryFn: () =>
      apiFetch<FileEntry[]>(
        `/api/servers/${serverId}/files?path=${encodeURIComponent(path)}`,
      ),
  })

  const invalidateEntries = () =>
    queryClient.invalidateQueries({ queryKey: ['files', serverId] })

  const createFolderMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<void>(`/api/servers/${serverId}/files/directories`, {
        method: 'POST',
        body: { path: joinPath(path, name) },
      }),
    onSuccess: invalidateEntries,
  })

  const renameMutation = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      apiFetch<void>(`/api/servers/${serverId}/files`, {
        method: 'PATCH',
        body: { from, to },
      }),
    onSuccess: invalidateEntries,
  })

  const removeMutation = useMutation({
    mutationFn: (targetPath: string) =>
      apiFetch<void>(
        `/api/servers/${serverId}/files?path=${encodeURIComponent(targetPath)}`,
        { method: 'DELETE' },
      ),
    onSuccess: invalidateEntries,
  })

  async function handleCreateFolder(name: string): Promise<void> {
    await createFolderMutation.mutateAsync(name)
    setCreateFolderOpen(false)
  }

  async function handleRename(newName: string): Promise<void> {
    if (!renameTarget) return
    await renameMutation.mutateAsync({
      from: renameTarget.path,
      to: joinPath(path, newName),
    })
    setRenameTarget(null)
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    await removeMutation.mutateAsync(deleteTarget.path)
    setDeleteTarget(null)
  }

  async function handleUpload(file: File): Promise<void> {
    setActionError(null)
    try {
      await uploadFile(serverId, path, file)
      invalidateEntries()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Import impossible')
    }
  }

  const breadcrumbs = buildBreadcrumbs(path)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <button
              type="button"
              className="rounded text-muted-foreground hover:text-foreground"
              onClick={() => setPath('')}
            >
              Racine
            </button>
            {breadcrumbs.map((segment) => (
              <span key={segment.path} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <button
                  type="button"
                  className="rounded text-muted-foreground hover:text-foreground"
                  onClick={() => setPath(segment.path)}
                >
                  {segment.label}
                </button>
              </span>
            ))}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="h-4 w-4" />
              Nouveau dossier
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Importer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => entriesQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleUpload(file)
              e.target.value = ''
            }}
          />

          {actionError ? (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {actionError}
            </p>
          ) : null}

          {entriesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : entriesQuery.isError ? (
            <p role="alert" className="text-sm text-red-600">
              {(entriesQuery.error as Error).message}
            </p>
          ) : (entriesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Dossier vide.</p>
          ) : (
            <div className="space-y-2">
              {(entriesQuery.data ?? []).map((entry) => (
                <div
                  key={entry.path}
                  className="flex items-center gap-3 rounded-md border p-2"
                >
                  {entry.type === 'directory' ? (
                    <Folder className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  {entry.type === 'directory' ? (
                    <button
                      type="button"
                      className="flex-1 truncate text-left text-sm font-medium hover:underline"
                      onClick={() => setPath(entry.path)}
                    >
                      {entry.name}
                    </button>
                  ) : (
                    <span className="flex-1 truncate text-sm">{entry.name}</span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.type === 'file' ? formatBytes(entry.sizeBytes) : ''}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {entry.type === 'file' ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditTarget(entry)}>
                          <Pencil className="h-4 w-4" />
                          Éditer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActionError(null)
                            downloadFile(serverId, entry.path).catch((err: Error) =>
                              setActionError(err.message),
                            )
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Télécharger
                        </Button>
                      </>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => setRenameTarget(entry)}>
                      Renommer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(entry)}>
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FileCreateFolderModal
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onSubmit={handleCreateFolder}
      />
      {renameTarget ? (
        <FileRenameModal
          key={renameTarget.path}
          entry={renameTarget}
          open={Boolean(renameTarget)}
          onClose={() => setRenameTarget(null)}
          onSubmit={handleRename}
        />
      ) : null}
      {deleteTarget ? (
        <FileDeleteModal
          key={deleteTarget.path}
          entry={deleteTarget}
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onSubmit={handleDelete}
        />
      ) : null}
      {editTarget ? (
        <FileEditorModal
          key={editTarget.path}
          serverId={serverId}
          entry={editTarget}
          open={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          onSaved={invalidateEntries}
        />
      ) : null}
    </div>
  )
}