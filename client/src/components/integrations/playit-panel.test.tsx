import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PlayitPanel } from '@/components/integrations/playit-panel'
import type { PlayitTunnel } from '@/lib/types'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function makeTunnel(overrides: Partial<PlayitTunnel> = {}): PlayitTunnel {
  return {
    serverId: 's1',
    serverName: 'Survie',
    tunnelId: 't1',
    host: 'abc.playit.gg',
    port: 25565,
    createdAt: '2026-08-20T12:00:00.000Z',
    ...overrides,
  }
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PlayitPanel serverId="s1" />
    </QueryClientProvider>,
  )
}

describe('PlayitPanel', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the agent status and the server tunnel', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ agent: 'running', tunnels: 1 }))
      .mockResolvedValueOnce(jsonResponse(makeTunnel()))

    renderPanel()

    await waitFor(() => expect(screen.getByText('En cours')).toBeInTheDocument())
    expect(screen.getByText('1 tunnel(s)')).toBeInTheDocument()
    expect(screen.getByText('abc.playit.gg:25565')).toBeInTheDocument()
  })

  it('shows a disabled agent', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ agent: 'disabled', tunnels: 0 }))
      .mockResolvedValueOnce(jsonResponse(makeTunnel()))

    renderPanel()

    await waitFor(() => expect(screen.getByText('Désactivé')).toBeInTheDocument())
  })

  it('creates a tunnel when none exists', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ agent: 'stopped', tunnels: 0 }))

    renderPanel()

    await waitFor(() => expect(screen.getByText('Aucun tunnel pour ce serveur.')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /créer un tunnel/i }))

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).endsWith('/api/playit/servers/s1/tunnels') && options?.method === 'POST',
      )
      expect(createCall).toBeDefined()
    })
  })

  it('deletes the tunnel after confirmation', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ agent: 'running', tunnels: 1 }))
      .mockResolvedValueOnce(jsonResponse(makeTunnel()))
      .mockResolvedValueOnce(jsonResponse(undefined, 204))

    renderPanel()

    await waitFor(() => expect(screen.getByText('abc.playit.gg:25565')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^supprimer$/i }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^supprimer$/i }))

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).endsWith('/api/playit/servers/s1/tunnels') && options?.method === 'DELETE',
      )
      expect(deleteCall).toBeDefined()
    })
  })
})