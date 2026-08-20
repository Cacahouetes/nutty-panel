import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { FileEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export interface FileEditorModalProps {
  serverId: string
  entry: FileEntry
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function FileEditorModal({
  serverId,
  entry,
  open,
  onClose,
  onSaved,
}: FileEditorModalProps) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const query = useQuery({
    queryKey: ['file-content', serverId, entry.path],
    queryFn: () =>
      apiFetch<string>(
        `/api/servers/${serverId}/files/content?path=${encodeURIComponent(entry.path)}`,
      ),
    enabled: open,
  })

  useEffect(() => {
    if (open && query.data !== undefined) {
      setContent(query.data)
    }
  }, [open, query.data])

  async function handleSave(): Promise<void> {
    setError(null)
    setSaving(true)
    try {
      await apiFetch<void>(
        `/api/servers/${serverId}/files/content?path=${encodeURIComponent(entry.path)}`,
        { method: 'PUT', body: { content } },
      )
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Éditer ${entry.name}`} className="max-w-2xl">
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : query.isError ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-red-600">
            {(query.error as Error).message}
          </p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            aria-label="Contenu du fichier"
            className="h-96 w-full rounded-md border border-input bg-transparent p-3 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={content ?? ''}
            onChange={(e) => setContent(e.target.value)}
          />
          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || content === null}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}