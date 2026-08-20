import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerMetrics } from '@/components/servers/server-metrics'
import type { MetricsSnapshot } from '@/lib/types'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function makeMetrics(overrides: Partial<MetricsSnapshot> = {}): MetricsSnapshot {
  return {
    serverId: 's1',
    cpuPercent: 40,
    memoryUsageBytes: 512 * 1024 * 1024,
    memoryLimitBytes: 2048 * 1024 * 1024,
    memoryPercent: 25,
    readAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderWidget(enabled: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ServerMetrics serverId="s1" enabled={enabled} />
    </QueryClientProvider>,
  )
}

describe('ServerMetrics', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches and renders cpu and memory usage', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeMetrics()))

    renderWidget(true)

    await waitFor(() => expect(screen.getByTestId('server-metrics')).toBeInTheDocument())
    expect(screen.getByTestId('metrics-cpu')).toHaveTextContent('40 %')
    expect(screen.getByTestId('metrics-ram')).toHaveTextContent('512 / 2048 Mo')
    const bars = screen.getAllByRole('progressbar')
    expect(bars[0]).toHaveAttribute('aria-valuenow', '40')
    expect(bars[1]).toHaveAttribute('aria-valuenow', '25')
  })

  it('requests the metrics endpoint of the server', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeMetrics()))

    renderWidget(true)

    await waitFor(() => expect(screen.getByTestId('server-metrics')).toBeInTheDocument())
    const call = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/api/servers/s1/metrics'),
    )
    expect(call).toBeDefined()
  })

  it('shows a dash placeholder when polling is disabled', () => {
    renderWidget(false)

    expect(screen.getByText('Métriques : —')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a dash placeholder when metrics are unavailable', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'server not running' }, 409))

    renderWidget(true)

    await waitFor(() => expect(screen.getByText('Métriques : —')).toBeInTheDocument())
  })
})
