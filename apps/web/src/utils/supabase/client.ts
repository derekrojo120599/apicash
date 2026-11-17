/* eslint-disable @typescript-eslint/no-explicit-any */
import { createBrowserClient } from '@supabase/ssr'
import { isDemoModeActive } from '@/lib/demoData'
import { createDemoClient } from '@/lib/demoClient'

let client: ReturnType<typeof createBrowserClient> | null = null

const REQUEST_TIMEOUT_MS = 20000

/**
 * Fetch wrapper that aborts any request that hangs too long, so mutations
 * (and queries) can never leave the UI stuck in a "Guardando..." state forever.
 */
async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error('La conexión tardó demasiado. Revisa tu internet e intenta de nuevo.')
    }
    throw err
  }
}

export function createClient() {
  if (typeof window !== 'undefined' && isDemoModeActive()) {
    return createDemoClient() as any
  }

  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      global: {
        fetch: fetchWithTimeout
      }
    }
  )

  return client
}
