'use client'

/** Periodic reads pause in background tabs; an existing read may finish. */
export function startVisiblePolling(
  poll: (fromVisibility: boolean) => Promise<unknown> | void,
  intervalMs: number,
  { immediate = true }: { immediate?: boolean } = {},
) {
  let stopped = false
  let inFlight = false
  let pendingVisibilityRefresh = false
  let wasHidden = document.hidden
  let timer: number | undefined

  const refresh = async (fromVisibility = false) => {
    if (stopped || document.hidden) return
    if (inFlight) {
      if (fromVisibility) pendingVisibilityRefresh = true
      return
    }

    inFlight = true
    try {
      await poll(fromVisibility)
    } catch (error) {
      // Consumers normally handle request failures and display their own state.
      console.warn('[regulski-behawiorysta][visible-polling] refresh failed', error)
    } finally {
      inFlight = false
      if (pendingVisibilityRefresh && !stopped && !document.hidden) {
        pendingVisibilityRefresh = false
        void refresh(true)
      }
    }
  }

  const clearTimer = () => {
    if (timer !== undefined) window.clearInterval(timer)
    timer = undefined
  }
  const schedule = () => {
    clearTimer()
    timer = window.setInterval(() => { void refresh() }, intervalMs)
  }
  const onVisibilityChange = () => {
    const hidden = document.hidden
    if (hidden === wasHidden) return
    wasHidden = hidden
    clearTimer()

    if (hidden) {
      pendingVisibilityRefresh = false
      return
    }

    void refresh(true)
    schedule()
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  if (!wasHidden) {
    if (immediate) void refresh()
    schedule()
  }

  return () => {
    stopped = true
    pendingVisibilityRefresh = false
    clearTimer()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
