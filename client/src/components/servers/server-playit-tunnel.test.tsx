import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerPlayitTunnel } from '@/components/servers/server-playit-tunnel'
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
    serverName: 'Survival',
    tunnelId: 'tunnel-1',
    host: '123.playit.gg',
    port: 25565,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderWidget() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ServerPlayitTunnel serverId="s1" />
    </QueryClientProvider>,
  )
}

describe('ServerPlayitTunnel', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('displays the tunnel connection url', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTunnel()))

    renderWidget()

    await waitFor(() => expect(screen.getByTestId('server-playit-tunnel')).toBeInTheDocument())
    expect(screen.getByText(/123\.playit\.gg:25565/)).toBeInTheDocument()
  })

  it('shows a dash placeholder when no tunnel is configured', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'no tunnel' }, 404))

    renderWidget()

    await waitFor(() => expect(screen.getByText('Playit : —')).toBeInTheDocument())
  })

  it('shows a dash placeholder on any error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'boom' }, 500))

    renderWidget()

    await waitFor(() => expect(screen.getByText('Playit : —')).toBeInTheDocument())
  })
})