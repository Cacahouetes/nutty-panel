import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from '@/routes/dashboard'
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
    status: 'running',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists the servers with their status', async () => {
    fetchMock.mockResolvedValue(jsonResponse([makeServer()]))

    renderDashboard()

    await waitFor(() => expect(screen.getByText('Survie')).toBeInTheDocument())
    expect(screen.getByText('En ligne')).toBeInTheDocument()
    expect(screen.getByText('Port 25565')).toBeInTheDocument()
  })

  it('shows an empty state when there are no servers', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))

    renderDashboard()

    await waitFor(() =>
      expect(screen.getByText('Aucun serveur pour le moment.')).toBeInTheDocument(),
    )
  })

  it('starts a stopped server', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer({ status: 'stopped' })]))
      .mockResolvedValueOnce(jsonResponse(makeServer({ status: 'running' })))
      .mockResolvedValueOnce(jsonResponse([makeServer({ status: 'running' })]))

    renderDashboard()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /démarrer/i })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /démarrer/i }))

    await waitFor(() => {
      const startCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/api/servers/s1/start'),
      )
      expect(startCall).toBeDefined()
    })
  })

  it('stops a running server', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer()]))
      .mockResolvedValueOnce(jsonResponse(makeServer({ status: 'stopped' })))
      .mockResolvedValueOnce(jsonResponse([makeServer({ status: 'stopped' })]))

    renderDashboard()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /arrêter/i })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /arrêter/i }))

    await waitFor(() => {
      const stopCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/api/servers/s1/stop'),
      )
      expect(stopCall).toBeDefined()
    })
  })

  it('shows an error state with a retry button', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'boom' }, 500))

    renderDashboard()

    await waitFor(() =>
      expect(screen.getByText('Erreur de chargement')).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
  })
})