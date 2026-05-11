// src/api.ts
// Thin wrappers around the Express API. All requests go to the same origin
// (Vite proxies /api → localhost:3000 in dev — see vite.config.ts).

const BASE = '/api'

async function req<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return Promise.resolve(undefined as unknown as T)
  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface MeResponse {
  id: string
  email: string
}

export const auth = {
  me: ()                              => req<MeResponse>('GET', '/auth/me'),
  login: (email: string, password: string) =>
    req<MeResponse>('POST', '/auth/login', { email, password }),
  signup: (email: string, password: string) =>
    req<MeResponse>('POST', '/auth/signup', { email, password }),
  logout: ()                          => req<void>('POST', '/auth/logout'),
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export interface Post {
  id: string
  slug: string
  title: string
  created_by: string
  published_revision_id: string | null
  created_at: string
  updated_at: string
}

export const posts = {
  list: ()                            => req<Post[]>('GET', '/posts'),
  create: (slug: string, title: string) =>
    req<Post>('POST', '/posts', { slug, title }),
  update: (id: string, patch: Partial<Pick<Post, 'slug' | 'title' | 'published_revision_id'>>) =>
    req<Post>('PATCH', `/posts/${id}`, patch),
  delete: (id: string)                => req<void>('DELETE', `/posts/${id}`),
}

// ── Revisions ─────────────────────────────────────────────────────────────────

export interface Revision {
  id: string
  post_id: string
  ir_json: string        // serialised IRNode[]
  ir_schema_version: number
  created_at: string
}

export const revisions = {
  list: (postId: string) =>
    req<Revision[]>('GET', `/posts/${postId}/revisions`),
  create: (postId: string, irJson: unknown) =>
    req<Revision>('POST', `/posts/${postId}/revisions`, { ir_json: JSON.stringify(irJson) }),
  get: (postId: string, revId: string) =>
    req<Revision>('GET', `/posts/${postId}/revisions/${revId}`),
}

// ── Parse / Render ────────────────────────────────────────────────────────────

export const parseMarkdown = (markdown: string) =>
  req<{ nodes: unknown[] }>('POST', '/parse/markdown', { markdown })

export async function parseHtml(html: string): Promise<{ nodes: unknown[] }> {
  const res = await fetch(`${BASE}/parse/html`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<{ nodes: unknown[] }>
}

export const renderIR = (irJson: unknown) =>
  req<{ html: string }>('POST', '/render/ir', { nodes: irJson })

export const renderMarkdown = (markdown: string) =>
  req<{ html: string }>('POST', '/render/markdown', { markdown })
