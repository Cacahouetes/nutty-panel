import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export interface ConfirmModalProps {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  confirmVariant?: 'default' | 'destructive'
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = 'destructive',
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm(): Promise<void> {
    setError(null)
    setSubmitting(true)
    try {
      await onConfirm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Annuler
        </Button>
        <Button variant={confirmVariant} onClick={handleConfirm} disabled={submitting}>
          {submitting ? `${confirmLabel}…` : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}