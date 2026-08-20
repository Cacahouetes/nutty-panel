import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BackupPanel } from '@/components/backups/backup-panel'
import type { Backup } from '@/lib/types'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function makeBackup(overrides: Partial<Backup> = {}): Backup {
  return {
    id: 'b1',
    serverId: 's1',
    createdAt: '2026-08-20T12:00:00.000Z',
    sizeBytes: 2048,
    archiveKey: 'archive/b1.zip',
    ...overrides,
  }
}

function makePolicy() {
  return { serverId: 's1', intervalMinutes: 120, maxBackups: 3 }
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BackupPanel serverId="s1" />
    </QueryClientProvider>,
  )
}

describe('BackupPanel', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists backups and prefills the policy form', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeBackup()]))
      .mockResolvedValueOnce(jsonResponse(makePolicy()))

    renderPanel()

    await waitFor(() => expect(screen.getByText('b1')).toBeInTheDocument())
    expect(screen.getByText(/2\.0 Ko/)).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByLabelText('Intervalle (minutes)')).toHaveValue(120),
    )
    expect(screen.getByLabelText('Sauvegardes conservées')).toHaveValue(3)
  })

  it('shows an empty state', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(makePolicy()))

    renderPanel()

    await waitFor(() =>
      expect(screen.getByText('Aucune sauvegarde pour le moment.')).toBeInTheDocument(),
    )
  })

  it('creates a backup', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(makePolicy()))
      .mockResolvedValueOnce(jsonResponse(makeBackup({ id: 'b2' })))

    renderPanel()

    await waitFor(() =>
      expect(screen.getByText('Aucune sauvegarde pour le moment.')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /créer une sauvegarde/i }))

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).endsWith('/api/servers/s1/backups') && options?.method === 'POST',
      )
      expect(createCall).toBeDefined()
    })
  })

  it('restores a backup after confirmation', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeBackup()]))
      .mockResolvedValueOnce(jsonResponse(makePolicy()))
      .mockResolvedValueOnce(jsonResponse(undefined, 204))

    renderPanel()

    await waitFor(() => expect(screen.getByText('b1')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^restaurer$/i }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^restaurer$/i }))

    await waitFor(() => {
      const restoreCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).endsWith('/api/backups/b1/restore') && options?.method === 'POST',
      )
      expect(restoreCall).toBeDefined()
    })
  })

  it('deletes a backup after confirmation', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeBackup()]))
      .mockResolvedValueOnce(jsonResponse(makePolicy()))
      .mockResolvedValueOnce(jsonResponse(undefined, 204))

    renderPanel()

    await waitFor(() => expect(screen.getByText('b1')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^supprimer$/i }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^supprimer$/i }))

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, options]) => String(url).endsWith('/api/backups/b1') && options?.method === 'DELETE',
      )
      expect(deleteCall).toBeDefined()
    })
  })

  it('saves the backup policy', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(makePolicy()))
      .mockResolvedValueOnce(
        jsonResponse({ serverId: 's1', intervalMinutes: 30, maxBackups: 5 }),
      )

    renderPanel()

    await waitFor(() =>
      expect(screen.getByLabelText('Intervalle (minutes)')).toHaveValue(120),
    )
    fireEvent.change(screen.getByLabelText('Intervalle (minutes)'), {
      target: { value: '30' },
    })
    fireEvent.change(screen.getByLabelText('Sauvegardes conservées'), {
      target: { value: '5' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enregistrer la politique/i }))

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).endsWith('/api/servers/s1/backup-policy') &&
          options?.method === 'PATCH',
      )
      expect(patchCall).toBeDefined()
      expect(JSON.parse(patchCall![1].body)).toMatchObject({
        intervalMinutes: 30,
        maxBackups: 5,
      })
    })
  })
})