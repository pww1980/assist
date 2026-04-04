import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const newAccess: string = data.access_token
    saveTokens(newAccess, refresh)
    return newAccess
  } catch {
    return null
  }
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = getAccessToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (!newToken) {
      clearTokens()
      if (typeof window !== 'undefined') {
        window.location.href = '/login/'
      }
      throw new Error('Unauthorized')
    }
    headers['Authorization'] = `Bearer ${newToken}`
    const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers })
    if (!retryRes.ok) throw new Error(`API error: ${retryRes.status}`)
    return retryRes.json()
  }

  if (!res.ok) throw new Error(`API error: ${res.status}`)

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, data: unknown) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path: string, data: unknown) =>
    apiFetch(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Login fehlgeschlagen')
  }
  return res.json()
}
