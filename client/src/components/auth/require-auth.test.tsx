import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { RequireAuth } from '@/components/auth/require-auth'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

describe('RequireAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects to /login when unauthenticated', async () => {
    vi.stubGlobal('fetch', vi.fn())

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <div>protected</div>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>login-page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('login-page')).toBeInTheDocument())
  })

  it('renders children when authenticated', async () => {
    localStorage.setItem(
      'nutty-tokens',
      JSON.stringify({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ id: 'u1', email: 'a@b.c', role: 'admin' }),
      ),
    )

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <div>protected</div>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>login-page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('protected')).toBeInTheDocument())
  })
})