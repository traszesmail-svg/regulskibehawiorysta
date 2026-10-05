'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { OperatorStatusData } from '@/components/AdminOperatorMobileCard'

export function useOperatorStatus(initialData: OperatorStatusData | null | undefined) {
  const [data, setData] = useState<OperatorStatusData | null>(initialData ?? null)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const activeController = useRef<AbortController | null>(null)
  const generation = useRef(0)

  useEffect(() => {
    generation.current = generation.current + 1
    activeController.current?.abort()
    activeController.current = null
    inFlight.current = false
    setData(initialData ?? null)
    setError(null)
  }, [initialData])

  const refresh = useCallback(async () => {
    if (inFlight.current) return false
    inFlight.current = true
    const controller = new AbortController()
    activeController.current = controller
    const currentGeneration = generation.current
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch('/api/admin/operator/status', { cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error(response.status === 401 ? 'Sesja panelu wygasła. Zaloguj się ponownie.' : `Nie udało się odświeżyć statusu (HTTP ${response.status}).`)
      const next = await response.json() as OperatorStatusData
      if (currentGeneration !== generation.current) return false
      setData(next)
      setError(null)
      return true
    } catch (cause) {
      if (currentGeneration !== generation.current) return false
      setError(cause instanceof Error && cause.name === 'AbortError' ? 'Odświeżanie statusu przekroczyło 8 sekund.' : cause instanceof Error ? cause.message : 'Nie udało się odświeżyć statusu.')
      return false
    } finally {
      clearTimeout(timeout)
      if (activeController.current === controller) {
        inFlight.current = false
        activeController.current = null
      }
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => { void refresh() }, 10000)
    return () => {
      clearInterval(timer)
      generation.current = generation.current + 1
      activeController.current?.abort()
      activeController.current = null
      inFlight.current = false
    }
  }, [refresh])

  return { data, error, refresh }
}
