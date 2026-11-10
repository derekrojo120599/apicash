/* eslint-disable @typescript-eslint/no-explicit-any */
import { createBrowserClient } from '@supabase/ssr'
import { isDemoModeActive } from '@/lib/demoData'
import { createDemoClient } from '@/lib/demoClient'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (typeof window !== 'undefined' && isDemoModeActive()) {
    return createDemoClient() as any
  }

  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  )

  return client
}
