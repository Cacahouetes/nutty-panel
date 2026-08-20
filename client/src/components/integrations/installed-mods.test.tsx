import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InstalledMods } from '@/components/integrations/installed-mods'
import type { InstalledMod } from '@/lib/types'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function makeMod(overrides: Partial<InstalledMod> = {}): InstalledMod {
  return {
    id: 'mod1',
    serverId: 's1',
    provider: 'modrinth',
    projectId: 'AABb',
    projectName: 'Sodium',
    versionId: 'v1',
    fileName: 'sodium.jar',
    targetPath: '/mods/sodium.jar',
    installedAt: '2026-08-20T12:00:00.000Z',
    ...overrides,
  }
}

function renderInstalled() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <InstalledMods serverId="s1" />
    </QueryClientProvider>,
  )
}

describe('InstalledMods', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists installed mods', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([makeMod()]))

    renderInstalled()

    await waitFor(() => expect(screen.getByText('Sodium')).toBeInTheDocument())
    expect(screen.getByText(/Modrinth · sodium\.jar · /)).toBeInTheDocument()
    expect(screen.getByText('1 élément')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    renderInstalled()

    await waitFor(() =>
      expect(screen.getByText('Aucun mod ou plugin installé sur ce serveur.')).toBeInTheDocument(),
    )
  })

  it('uninstalls a mod after confirmation', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeMod()]))
      .mockResolvedValueOnce(jsonResponse(undefined, 204))

    renderInstalled()

    await waitFor(() => expect(screen.getByText('Sodium')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /désinstaller/i }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /désinstaller/i }))

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).endsWith('/api/integrations/installed/mod1') && options?.method === 'DELETE',
      )
      expect(deleteCall).toBeDefined()
    })
  })
})