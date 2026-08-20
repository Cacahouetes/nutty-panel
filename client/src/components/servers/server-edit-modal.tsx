import { useState, type FormEvent } from 'react'
import type { ServerInstance, UpdateServerInput } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'

export interface ServerEditModalProps {
  server: ServerInstance
  open: boolean
  onClose: () => void
  onSubmit: (input: UpdateServerInput) => Promise<void>
}

export function ServerEditModal({ server, open, onClose, onSubmit }: ServerEditModalProps) {
  const [name, setName] = useState(server.name)
  const [memoryMb, setMemoryMb] = useState(String(server.memoryMb))
  const [cpuPercent, setCpuPercent] = useState(String(server.cpuPercent))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        memoryMb: Number(memoryMb),
        cpuPercent: Number(cpuPercent),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Modifier ${server.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="server-edit-name">Nom</Label>
          <Input
            id="server-edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="server-edit-memory">Mémoire (Mo)</Label>
            <Input
              id="server-edit-memory"
              type="number"
              min={256}
              value={memoryMb}
              onChange={(e) => setMemoryMb(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="server-edit-cpu">CPU (%)</Label>
            <Input
              id="server-edit-cpu"
              type="number"
              min={1}
              max={100}
              value={cpuPercent}
              onChange={(e) => setCpuPercent(e.target.value)}
              required
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}