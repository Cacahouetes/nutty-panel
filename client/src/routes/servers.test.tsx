import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServersPage } from '@/routes/servers'
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

function renderServers() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ServersPage />
    </QueryClientProvider>,
  )
}

describe('ServersPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists the servers with their status', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([makeServer()]))

    renderServers()

    await waitFor(() => expect(screen.getByText('Survie')).toBeInTheDocument())
    expect(screen.getByText('En ligne')).toBeInTheDocument()
    expect(screen.getByText('Port 25565')).toBeInTheDocument()
  })

  it('shows an empty state with a create shortcut', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    renderServers()

    await waitFor(() =>
      expect(screen.getByText('Aucun serveur pour le moment.')).toBeInTheDocument(),
    )
    expect(screen.getAllByRole('button', { name: /créer un serveur/i }).length).toBeGreaterThan(0)
  })

  it('creates a server from the form', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(makeServer({ name: 'Nouveau' })))

    renderServers()

    await waitFor(() =>
      expect(screen.getByText('Aucun serveur pour le moment.')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getAllByRole('button', { name: /nouveau serveur/i })[0])

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Nouveau' } })
    fireEvent.change(screen.getByLabelText('Port'), { target: { value: '25566' } })
    fireEvent.click(screen.getByRole('button', { name: /créer le serveur/i }))

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        ([url, options]) => String(url) === '/api/servers' && options?.method === 'POST',
      )
      expect(createCall).toBeDefined()
      expect(JSON.parse(createCall![1].body)).toMatchObject({
        name: 'Nouveau',
        type: 'vanilla',
        version: '1.21.4',
        port: 25566,
        memoryMb: 2048,
        cpuPercent: 100,
      })
    })
  })

  it('switches available versions when the type changes', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    renderServers()

    await waitFor(() =>
      expect(screen.getByText('Aucun serveur pour le moment.')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getAllByRole('button', { name: /nouveau serveur/i })[0])

    const versionSelect = screen.getByLabelText('Version') as HTMLSelectElement
    expect(versionSelect.options.length).toBe(5)

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'forge' } })
    expect((screen.getByLabelText('Version') as HTMLSelectElement).options.length).toBe(2)
  })

  it('shows the create error returned by the API', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ message: 'port 25565 is already in use' }, 409))

    renderServers()

    await waitFor(() =>
      expect(screen.getByText('Aucun serveur pour le moment.')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getAllByRole('button', { name: /nouveau serveur/i })[0])
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Nouveau' } })
    fireEvent.click(screen.getByRole('button', { name: /créer le serveur/i }))

    await waitFor(() =>
      expect(screen.getByText('port 25565 is already in use')).toBeInTheDocument(),
    )
  })

  it('edits a server', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer()]))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse(makeServer({ memoryMb: 4096 })))

    renderServers()

    await waitFor(() => expect(screen.getByText('Survie')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /éditer/i }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Mémoire (Mo)'), {
      target: { value: '4096' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, options]) => String(url).endsWith('/s1') && options?.method === 'PATCH',
      )
      expect(patchCall).toBeDefined()
      expect(JSON.parse(patchCall![1].body)).toMatchObject({
        name: 'Survie',
        memoryMb: 4096,
        cpuPercent: 100,
      })
    })
  })

  it('deletes a stopped server after confirmation', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer({ status: 'stopped' })]))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse(undefined, 204))

    renderServers()

    await waitFor(() => expect(screen.getByText('Survie')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /supprimer/i }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /supprimer/i }))

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, options]) => String(url).endsWith('/s1') && options?.method === 'DELETE',
      )
      expect(deleteCall).toBeDefined()
    })
  })

  it('starts a stopped server', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeServer({ status: 'stopped' })]))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse(makeServer({ status: 'starting' })))

    renderServers()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /démarrer/i })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /démarrer/i }))

    await waitFor(() => {
      const startCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/s1/start'),
      )
      expect(startCall).toBeDefined()
    })
  })

  it('shows an error state with a retry button', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'boom' }, 500))

    renderServers()

    await waitFor(() =>
      expect(screen.getByText('Erreur de chargement')).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
  })
})