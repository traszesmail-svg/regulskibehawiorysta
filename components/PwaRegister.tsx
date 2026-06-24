'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/push-sw.js').catch((err) => {
        console.error('Service Worker registration failed:', err)
      })
    }
  }, [])

  return null
}
