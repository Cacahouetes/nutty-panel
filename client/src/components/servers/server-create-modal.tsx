import { useState, type FormEvent } from 'react'
import {
  SERVER_TYPE_LABELS,
  SUPPORTED_VERSIONS,
  type CreateServerInput,
  type ServerType,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'

export interface ServerCreateModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: CreateServerInput) => Promise<void>
}

export function ServerCreateModal({ open, onClose, onSubmit }: ServerCreateModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<ServerType>('vanilla')
  const [version, setVersion] = useState(SUPPORTED_VERSIONS.vanilla[0])
  const [port, setPort] = useState('25565')
  const [memoryMb, setMemoryMb] = useState('2048')
  const [cpuPercent, setCpuPercent] = useState('100')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const versions = SUPPORTED_VERSIONS[type]

  function handleTypeChange(next: ServerType): void {
    setType(next)
    setVersion(SUPPORTED_VERSIONS[next][0])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        type,
        version,
        port: Number(port),
        memoryMb: Number(memoryMb),
        cpuPercent: Number(cpuPercent),
      })
      setName('')
      setType('vanilla')
      setVersion(SUPPORTED_VERSIONS.vanilla[0])
      setPort('25565')
      setMemoryMb('2048')
      setCpuPercent('100')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau serveur"
      description="Crée une instance Minecraft isolée par Docker."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="server-name">Nom</Label>
          <Input
            id="server-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Survie"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="server-type">Type</Label>
            <Select
              id="server-type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as ServerType)}
            >
              {(Object.keys(SERVER_TYPE_LABELS) as ServerType[]).map((t) => (
                <option key={t} value={t}>
                  {SERVER_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="server-version">Version</Label>
            <Select
              id="server-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="server-port">Port</Label>
            <Input
              id="server-port"
              type="number"
              min={25565}
              max={30000}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="server-memory">Mémoire (Mo)</Label>
            <Input
              id="server-memory"
              type="number"
              min={256}
              value={memoryMb}
              onChange={(e) => setMemoryMb(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="server-cpu">CPU (%)</Label>
            <Input
              id="server-cpu"
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
            {submitting ? 'Création…' : 'Créer le serveur'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}