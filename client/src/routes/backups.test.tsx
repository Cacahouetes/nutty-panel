import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BackupsPage } from '@/routes/backups'
import type { ServerInstance } from '@/lib/types'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function makeServer(overrides: Partial<ServerInstance> = {}): ServerInstance {
  return {
    id: 's1',
    name: 'Survie',
    type: 'paper',
    version: '1.20.4',
    port: 25565,
    memoryMb: 2048,
    cpuPercent: 100,
    status: 'stopped',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BackupsPage />
    </QueryClientProvider>,
  )
}

describe('BackupsPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the backups panel for the first server', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer()]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ serverId: 's1', intervalMinutes: 60, maxBackups: 5 }))

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Aucune sauvegarde pour le moment.')).toBeInTheDocument(),
    )
    expect(screen.getByRole('heading', { name: 'Sauvegardes' })).toBeInTheDocument()
  })

  it('switches the panel when another server is chosen', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer(), makeServer({ id: 's2', name: 'Minijeu' })]))
      .mockResolvedValueOnce(jsonResponse([{ id: 'b1', serverId: 's1', createdAt: '2026-08-20T12:00:00.000Z', sizeBytes: 2048, archiveKey: 'x' }]))
      .mockResolvedValueOnce(jsonResponse({ serverId: 's1', intervalMinutes: 60, maxBackups: 5 }))

    renderPage()

    await waitFor(() => expect(screen.getByText('b1')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Serveur'), { target: { value: 's2' } })

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/api/servers/s2/backups'),
      )
      expect(call).toBeDefined()
    })
  })

  it('shows an empty state when there are no servers', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    renderPage()

    await waitFor(() => expect(screen.getByText('Aucun serveur')).toBeInTheDocument())
  })
})