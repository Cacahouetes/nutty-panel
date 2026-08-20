import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IntegrationsPage } from '@/routes/integrations'
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
      <IntegrationsPage />
    </QueryClientProvider>,
  )
}

describe('IntegrationsPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the integrations panels for the first server', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer()]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ agent: 'running', tunnels: 1 }))
      .mockResolvedValueOnce(jsonResponse({ serverId: 's1', serverName: 'Survie', tunnelId: 't1', host: 'abc.playit.gg', port: 25565, createdAt: '2026-08-20T12:00:00.000Z' }))

    renderPage()

    await waitFor(() => expect(screen.getByText('Mods & plugins')).toBeInTheDocument())
    expect(screen.getByText('Installés sur le serveur')).toBeInTheDocument()
    expect(screen.getByText('Tunnel Playit')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Intégrations' })).toBeInTheDocument()
  })

  it('switches panels when another server is chosen', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer(), makeServer({ id: 's2', name: 'Minijeu' })]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ agent: 'stopped', tunnels: 0 }))
      .mockResolvedValueOnce(jsonResponse({ serverId: 's1', serverName: 'Survie', tunnelId: 't1', host: 'abc.playit.gg', port: 25565, createdAt: '2026-08-20T12:00:00.000Z' }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ serverId: 's2', serverName: 'Minijeu', tunnelId: 't2', host: 'def.playit.gg', port: 25566, createdAt: '2026-08-20T12:00:00.000Z' }))

    renderPage()

    await waitFor(() => expect(screen.getByText('Installés sur le serveur')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Serveur'), { target: { value: 's2' } })

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/api/servers/s2/integrations/installed'),
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