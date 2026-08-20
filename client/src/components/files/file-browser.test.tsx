import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FileBrowser } from '@/components/files/file-browser'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function renderBrowser() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FileBrowser serverId="s1" />
    </QueryClientProvider>,
  )
}

describe('FileBrowser', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists files and directories with their sizes', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { name: 'world', path: 'world', type: 'directory' },
        {
          name: 'server.properties',
          path: 'server.properties',
          type: 'file',
          sizeBytes: 2048,
        },
      ]),
    )

    renderBrowser()

    await waitFor(() => expect(screen.getByText('world')).toBeInTheDocument())
    expect(screen.getByText('server.properties')).toBeInTheDocument()
    expect(screen.getByText('2.0 Ko')).toBeInTheDocument()
  })

  it('navigates into a directory', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ name: 'world', path: 'world', type: 'directory' }]),
    )

    renderBrowser()

    await waitFor(() => expect(screen.getByText('world')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /world/i }))

    await waitFor(() => {
      const navCall = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/api/servers/s1/files?path=world'),
      )
      expect(navCall).toBeDefined()
    })
  })

  it('creates a folder', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    renderBrowser()

    await waitFor(() => expect(screen.getByText('Dossier vide.')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /nouveau dossier/i }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Nom du dossier'), {
      target: { value: 'plugins' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /créer/i }))

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).endsWith('/api/servers/s1/files/directories') &&
          options?.method === 'POST',
      )
      expect(createCall).toBeDefined()
      expect(JSON.parse(createCall![1].body)).toMatchObject({ path: 'plugins' })
    })
  })

  it('renames a file', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ name: 'a.txt', path: 'a.txt', type: 'file', sizeBytes: 10 }]),
    )

    renderBrowser()

    await waitFor(() => expect(screen.getByText('a.txt')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^renommer$/i }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Nouveau nom'), {
      target: { value: 'b.txt' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /renommer/i }))

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).endsWith('/api/servers/s1/files') && options?.method === 'PATCH',
      )
      expect(patchCall).toBeDefined()
      expect(JSON.parse(patchCall![1].body)).toMatchObject({
        from: 'a.txt',
        to: 'b.txt',
      })
    })
  })

  it('deletes a file after confirmation', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ name: 'a.txt', path: 'a.txt', type: 'file', sizeBytes: 10 }]),
    )

    renderBrowser()

    await waitFor(() => expect(screen.getByText('a.txt')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /supprimer/i }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /supprimer/i }))

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).includes('/api/servers/s1/files?path=a.txt') &&
          options?.method === 'DELETE',
      )
      expect(deleteCall).toBeDefined()
    })
  })

  it('edits a text file and saves it', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([{ name: 'a.txt', path: 'a.txt', type: 'file', sizeBytes: 10 }]),
      )
      .mockResolvedValueOnce(jsonResponse('hello'))
      .mockResolvedValueOnce(jsonResponse(undefined, 204))

    renderBrowser()

    await waitFor(() => expect(screen.getByText('a.txt')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /éditer/i }))

    const textarea = await screen.findByLabelText('Contenu du fichier')
    expect(textarea).toHaveValue('hello')

    fireEvent.change(textarea, { target: { value: 'changed' } })
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).includes('/api/servers/s1/files/content') &&
          options?.method === 'PUT',
      )
      expect(putCall).toBeDefined()
      expect(JSON.parse(putCall![1].body)).toMatchObject({ content: 'changed' })
    })
  })

  it('uploads a file to the current folder', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    renderBrowser()

    await waitFor(() => expect(screen.getByText('Dossier vide.')).toBeInTheDocument())

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['content'], 'a.txt')] },
    })

    await waitFor(() => {
      const uploadCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url).includes('/api/servers/s1/files/upload') &&
          options?.method === 'POST' &&
          options?.body instanceof FormData,
      )
      expect(uploadCall).toBeDefined()
    })
  })
})