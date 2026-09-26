'use client'

import dynamic from 'next/dynamic'

const SplashScreen = dynamic(
  () => import('./SplashScreen').then(mod => mod.SplashScreen),
  { ssr: false }
)

export { SplashScreen as SplashScreenClient }
