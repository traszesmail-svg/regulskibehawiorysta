'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { APP_THEME_ATTRIBUTE, THEME_STORAGE_KEY, isAppTheme, type AppTheme } from '@/lib/theme'

function getSystemTheme(): AppTheme {
  if (typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readCurrentTheme(): AppTheme {
  const currentTheme = document.documentElement.getAttribute(APP_THEME_ATTRIBUTE)
  if (isAppTheme(currentTheme)) {
    return currentTheme
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (isAppTheme(storedTheme)) {
    return storedTheme
  }

  return getSystemTheme()
}

function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute(APP_THEME_ATTRIBUTE, theme)
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export function ThemeToggle() {
  return null
}
