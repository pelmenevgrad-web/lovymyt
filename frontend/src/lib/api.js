export const API_URL = import.meta.env.VITE_API_URL
const DEFAULT_TIMEOUT_MS = 15_000

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('lovymyt_token')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${DEFAULT_TIMEOUT_MS / 1000}s: ${path}`)
    }
    throw new Error(`Network error calling ${path}: ${err.message}`)
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }

  return res.json()
}
