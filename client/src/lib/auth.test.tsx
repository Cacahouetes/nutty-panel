import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/lib/auth'
import { getTokens } from '@/lib/api'

function AuthProbe() {
  const { user, loading, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => login('a@b.c', 'secret')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url === '/api/auth/login') {
          return jsonResponse({
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
            user: { id: 'u1', email: 'a@b.c', role: 'admin' },
          })
        }
        if (url === '/api/auth/me') {
          return jsonResponse({ id: 'u1', email: 'a@b.c', role: 'admin' })
        }
        if (url === '/api/auth/logout') {
          return jsonResponse({})
        }
        throw new Error(`unexpected url: ${url}`)
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts unauthenticated when no tokens are stored', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  it('restores the session from stored tokens via /me', async () => {
    localStorage.setItem(
      'nutty-tokens',
      JSON.stringify({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
    )

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('a@b.c'))
  })

  it('login stores tokens and exposes the user', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    fireEvent.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('a@b.c'))
    expect(getTokens()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' })
  })

  it('logout clears tokens and the user', async () => {
    localStorage.setItem(
      'nutty-tokens',
      JSON.stringify({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
    )

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('a@b.c'))
    fireEvent.click(screen.getByRole('button', { name: 'logout' }))

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'))
    expect(getTokens()).toBeNull()
  })

  it('clears tokens when /me returns 401', async () => {
    localStorage.setItem(
      'nutty-tokens',
      JSON.stringify({ accessToken: 'expired', refreshToken: 'refresh-1' }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ message: 'Unauthorized' }, 401),
      ),
    )

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'))
    expect(getTokens()).toBeNull()
  })
})