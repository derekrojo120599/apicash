'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { ThemeColorProvider } from './ThemeColorProvider'
import { RealtimeSyncProvider } from './RealtimeSyncProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: true, // Auto refetch al volver a la pestaña
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeColorProvider>
          <RealtimeSyncProvider>
            {children}
          </RealtimeSyncProvider>
        </ThemeColorProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
