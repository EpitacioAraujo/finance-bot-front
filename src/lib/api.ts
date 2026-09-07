const BASE_URL = '/api'

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    const text = await res.text()
    let message: string
    try {
      const json = JSON.parse(text)
      message =
        json.message ?? json.errors?.[0]?.message ?? `Erro ${res.status}`
    } catch {
      message = text || `Erro ${res.status}`
    }
    throw new Error(message)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}

export async function get<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint)
}

export async function post<T>(endpoint: string, body: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function put<T>(endpoint: string, body: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function del(endpoint: string): Promise<void> {
  return apiFetch<void>(endpoint, { method: 'DELETE' })
}
