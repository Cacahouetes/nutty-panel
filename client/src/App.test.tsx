import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '@/App'
import { AuthProvider } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function renderApp(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const SERVERS = [
  {
    id: 's1',
    name: 'Survie',
    type: 'paper',
    version: '1.20.4',
    port: 25565,
    memoryMb: 2048,
    cpuPercent: 100,
    status: 'running',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url === '/api/auth/me') {
          return jsonResponse({ id: 'u1', email: 'a@b.c', role: 'admin' })
        }
        if (url === '/api/servers') {
          return jsonResponse(SERVERS)
        }
        throw new Error(`unexpected url: ${url}`)
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the dashboard with servers when authenticated', async () => {
    localStorage.setItem(
      'nutty-tokens',
      JSON.stringify({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
    )

    renderApp(['/'])

    await waitFor(() => expect(screen.getByText('Survie')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Serveurs' })).toBeInTheDocument()
    expect(screen.getByText('En ligne')).toBeInTheDocument()
  })

  it('redirects an anonymous visitor to the login page', async () => {
    renderApp(['/'])

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Nutty Panel' })).toBeInTheDocument(),
    )
  })

  it('renders the login page at /login', () => {
    renderApp(['/login'])

    expect(screen.getByRole('heading', { name: 'Nutty Panel' })).toBeInTheDocument()
  })

  it('renders a 404 page for unknown routes', async () => {
    renderApp(['/unknown'])

    await waitFor(() => expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument())
  })
})