import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerAutoStart } from '@/components/servers/server-auto-start'
import type { AutoStartPolicy } from '@/lib/types'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function makePolicy(overrides: Partial<AutoStartPolicy> = {}): AutoStartPolicy {
  return {
    serverId: 's1',
    enabled: true,
    inactiveMinutes: 15,
    ...overrides,
  }
}

function renderWidget() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ServerAutoStart serverId="s1" />
    </QueryClientProvider>,
  )
}

describe('ServerAutoStart', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads and displays the auto-start policy', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makePolicy()))

    renderWidget()

    await waitFor(() => expect(screen.getByTestId('server-auto-start')).toBeInTheDocument())
    expect(screen.getByLabelText('Démarrage auto')).toBeChecked()
    expect(screen.getByLabelText('Inactivité (min)')).toHaveValue(15)
  })

  it('saves the updated policy through the API', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makePolicy()))

    renderWidget()

    await waitFor(() => expect(screen.getByTestId('server-auto-start')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('Démarrage auto'))
    fireEvent.change(screen.getByLabelText('Inactivité (min)'), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, init]) => {
        const requestInit = init as RequestInit | undefined
        return String(requestInit?.method).toUpperCase() === 'PUT'
      })
      expect(putCall).toBeDefined()
      const requestInit = putCall?.[1] as RequestInit
      expect(JSON.parse(String(requestInit.body))).toEqual({
        enabled: false,
        inactiveMinutes: 45,
      })
    })
  })

  it('shows a dash placeholder when the policy cannot be loaded', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'boom' }, 500))

    renderWidget()

    await waitFor(() => expect(screen.getByText('Auto : —')).toBeInTheDocument())
  })
})
