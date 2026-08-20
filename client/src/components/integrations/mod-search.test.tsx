import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ModSearch } from '@/components/integrations/mod-search'
import type { ModSearchResult } from '@/lib/types'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function makeResult(overrides: Partial<ModSearchResult> = {}): ModSearchResult {
  return {
    projectId: 'AABb',
    provider: 'modrinth',
    name: 'Sodium',
    description: 'Client-side performance mod',
    type: 'mod',
    downloads: 1200,
    ...overrides,
  }
}

function renderSearch() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ModSearch serverId="s1" />
    </QueryClientProvider>,
  )
}

describe('ModSearch', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a hint before any search', () => {
    renderSearch()

    expect(
      screen.getByText('Recherche un mod ou un plugin puis installe-le sur le serveur.'),
    ).toBeInTheDocument()
  })

  it('searches the provider and lists results', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([makeResult()]))

    renderSearch()

    fireEvent.change(screen.getByLabelText('Recherche'), { target: { value: 'sodium' } })
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }))

    await waitFor(() => expect(screen.getByText('Sodium')).toBeInTheDocument())
    expect(screen.getByText(/1 200 téléchargements/)).toBeInTheDocument()

    const searchCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/integrations/modrinth/search'),
    )
    expect(searchCall).toBeDefined()
    expect(String(searchCall![0])).toContain('query=sodium')
  })

  it('shows an empty result state', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    renderSearch()

    fireEvent.change(screen.getByLabelText('Recherche'), { target: { value: 'zzz' } })
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }))

    await waitFor(() => expect(screen.getByText('Aucun résultat.')).toBeInTheDocument())
  })

  it('installs a mod on the selected server', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeResult()]))
      .mockResolvedValueOnce(jsonResponse({ id: 'm1' }))

    renderSearch()

    fireEvent.change(screen.getByLabelText('Recherche'), { target: { value: 'sodium' } })
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }))

    await waitFor(() => expect(screen.getByText('Sodium')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /installer/i }))

    await waitFor(() => {
      const installCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).endsWith('/api/servers/s1/integrations/install') &&
          options?.method === 'POST',
      )
      expect(installCall).toBeDefined()
      expect(JSON.parse(installCall![1].body as string)).toMatchObject({
        provider: 'modrinth',
        projectId: 'AABb',
      })
    })
  })

  it('reports a search error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'provider unavailable' }, 500))

    renderSearch()

    fireEvent.change(screen.getByLabelText('Recherche'), { target: { value: 'sodium' } })
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }))

    await waitFor(() =>
      expect(screen.getByText('provider unavailable')).toBeInTheDocument(),
    )
  })
})