'use client'

import { useEffect, useRef } from 'react'

type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

const CLICK_TARGET_SELECTOR =
  'a, button, summary, [role="button"], [role="link"], [role="menuitem"], input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"]'

const SILENT_TARGET_SELECTOR = 'input:not([type]), input[type="text"], input[type="email"], input[type="search"], input[type="tel"], input[type="url"], textarea, select'
const CLICK_LENGTH_SECONDS = 0.07

function isClickableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false
  }

  if (target.closest(SILENT_TARGET_SELECTOR)) {
    return false
  }

  const clickable = target.closest(CLICK_TARGET_SELECTOR)

  if (!clickable || clickable.getAttribute('aria-disabled') === 'true') {
    return false
  }

  if (clickable instanceof HTMLButtonElement || clickable instanceof HTMLInputElement) {
    return !clickable.disabled
  }

  return true
}

function playSoftClick(audioContext: AudioContext) {
  const now = audioContext.currentTime
  const toneGain = audioContext.createGain()
  const tickGain = audioContext.createGain()
  const tone = audioContext.createOscillator()
  const tick = audioContext.createOscillator()
  const filter = audioContext.createBiquadFilter()
  const tickFilter = audioContext.createBiquadFilter()

  tone.type = 'triangle'
  tone.frequency.setValueAtTime(420, now)
  tone.frequency.exponentialRampToValueAtTime(310, now + CLICK_LENGTH_SECONDS)

  tick.type = 'sine'
  tick.frequency.setValueAtTime(980, now)
  tick.frequency.exponentialRampToValueAtTime(640, now + 0.025)

  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(680, now)
  filter.frequency.exponentialRampToValueAtTime(430, now + CLICK_LENGTH_SECONDS)

  tickFilter.type = 'bandpass'
  tickFilter.frequency.setValueAtTime(820, now)
  tickFilter.Q.setValueAtTime(0.7, now)

  toneGain.gain.setValueAtTime(0.0001, now)
  toneGain.gain.exponentialRampToValueAtTime(0.026, now + 0.005)
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + CLICK_LENGTH_SECONDS)

  tickGain.gain.setValueAtTime(0.0001, now)
  tickGain.gain.exponentialRampToValueAtTime(0.012, now + 0.003)
  tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028)

  tone.connect(filter)
  filter.connect(toneGain)
  toneGain.connect(audioContext.destination)

  tick.connect(tickFilter)
  tickFilter.connect(tickGain)
  tickGain.connect(audioContext.destination)

  tone.start(now)
  tone.stop(now + CLICK_LENGTH_SECONDS)
  tick.start(now)
  tick.stop(now + 0.03)
}

export function ClickSound() {
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const triggerClickSound = (target: EventTarget | null) => {
      if (!isClickableTarget(target)) {
        return
      }

      const AudioContextConstructor = window.AudioContext || (window as WebAudioWindow).webkitAudioContext

      if (!AudioContextConstructor) {
        return
      }

      const audioContext = audioContextRef.current ?? new AudioContextConstructor()
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        void audioContext.resume().then(() => playSoftClick(audioContext))
        return
      }

      playSoftClick(audioContext)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.defaultPrevented || event.button !== 0 || !event.isPrimary) {
        return
      }

      triggerClickSound(event.target)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || (event.key !== 'Enter' && event.key !== ' ')) {
        return
      }

      triggerClickSound(event.target)
    }

    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    document.addEventListener('keydown', onKeyDown, { capture: true })

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true })
      document.removeEventListener('keydown', onKeyDown, { capture: true })
      void audioContextRef.current?.close()
      audioContextRef.current = null
    }
  }, [])

  return null
}
