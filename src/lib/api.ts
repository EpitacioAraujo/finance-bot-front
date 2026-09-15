const BASE_URL = '/api'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

/**
 * PROVISÓRIO, espelha o guard do backend: não existe autenticação, o usuário é
 * fixo e vem do build. Trocar quando entrar login de verdade.
 */
const USER_ID = import.meta.env.VITE_USER_ID as string

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
    'x-user-id': USER_ID,
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
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}

export async function get<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint)
}

export async function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
}

export async function patch<T>(endpoint: string, body: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function del(endpoint: string): Promise<void> {
  return apiFetch<void>(endpoint, { method: 'DELETE' })
}

/** Monta a query ignorando o que estiver indefinido. */
export function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  return search.toString()
}
