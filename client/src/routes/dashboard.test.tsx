import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows overview stats and the servers list', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([makeServer(), makeServer({ id: 's2', name: 'Minijeu', status: 'stopped' })]),
    )

    renderDashboard()

    await waitFor(() => expect(screen.getByText('Survie')).toBeInTheDocument())
    expect(screen.getByText('Minijeu')).toBeInTheDocument()
    expect(screen.getAllByText('En ligne').length).toBeGreaterThan(0)
    expect(screen.getByText('Arrêtés')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /gérer les serveurs/i })).toHaveAttribute(
      'href',
      '/servers',
    )
  })

  it('shows an empty state linking to the servers page', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    renderDashboard()

    await waitFor(() =>
      expect(screen.getByText('Aucun serveur pour le moment.')).toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: /créer un serveur/i })).toHaveAttribute(
      'href',
      '/servers',
    )
  })

  it('shows an error state with a retry button', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'boom' }, 500))

    renderDashboard()

    await waitFor(() =>
      expect(screen.getByText('Erreur de chargement')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }))
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1))
  })
})