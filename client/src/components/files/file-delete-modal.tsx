import { useState } from 'react'
import type { FileEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export interface FileDeleteModalProps {
  entry: FileEntry
  open: boolean
  onClose: () => void
  onSubmit: () => Promise<void>
}

export function FileDeleteModal({ entry, open, onClose, onSubmit }: FileDeleteModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm(): Promise<void> {
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Supprimer ${entry.name}`}>
      <p className="text-sm text-muted-foreground">
        Cette action est irréversible{entry.type === 'directory' ? ' (tout le contenu du dossier sera supprimé)' : ''}.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Annuler
        </Button>
        <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
          {submitting ? 'Suppression…' : 'Supprimer'}
        </Button>
      </div>
    </Modal>
  )
}