import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FilesPage } from '@/routes/files'
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

function renderFilesPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FilesPage />
    </QueryClientProvider>,
  )
}

describe('FilesPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the file browser for the first server', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer()]))
      .mockResolvedValueOnce(
        jsonResponse([{ name: 'server.properties', path: 'server.properties', type: 'file' }]),
      )

    renderFilesPage()

    await waitFor(() => expect(screen.getByText('server.properties')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Fichiers' })).toBeInTheDocument()
  })

  it('switches the browser when another server is chosen', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer(), makeServer({ id: 's2', name: 'Minijeu' })]))
      .mockResolvedValueOnce(jsonResponse([{ name: 'a.txt', path: 'a.txt', type: 'file' }]))

    renderFilesPage()

    await waitFor(() => expect(screen.getByText('a.txt')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Serveur'), { target: { value: 's2' } })

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/api/servers/s2/files'),
      )
      expect(call).toBeDefined()
    })
  })

  it('shows an empty state when there are no servers', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    renderFilesPage()

    await waitFor(() => expect(screen.getByText('Aucun serveur')).toBeInTheDocument())
  })
})