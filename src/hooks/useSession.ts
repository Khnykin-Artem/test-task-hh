/**
 * Сессия пользователя: режим работы и учётные данные GREEN-API.
 * Хранится в localStorage, чтобы перезагрузка страницы не прерывала чат.
 */

import { useCallback, useState } from 'react'
import { DEFAULT_API_URL } from '../api/greenApi'
import type { Credentials, Session } from '../types'

const STORAGE_KEY = 'max-green-api-chat:session'

function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<Session>

    if (parsed?.mode === 'demo') {
      return { mode: 'demo', credentials: null }
    }

    const credentials = parsed?.credentials
    if (credentials?.idInstance && credentials?.apiTokenInstance) {
      return {
        mode: 'live',
        credentials: {
          idInstance: credentials.idInstance,
          apiTokenInstance: credentials.apiTokenInstance,
          apiUrl: credentials.apiUrl || DEFAULT_API_URL,
        },
      }
    }

    return null
  } catch {
    return null
  }
}

function persistSession(session: Session | null): void {
  try {
    if (session === null) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Приватный режим или переполнение хранилища — не критично.
  }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(() => loadSession())

  const signInDemo = useCallback(() => {
    const next: Session = { mode: 'demo', credentials: null }
    persistSession(next)
    setSession(next)
  }, [])

  const signInLive = useCallback((credentials: Credentials) => {
    const next: Session = { mode: 'live', credentials }
    persistSession(next)
    setSession(next)
  }, [])

  const signOut = useCallback(() => {
    persistSession(null)
    setSession(null)
  }, [])

  return { session, signInDemo, signInLive, signOut }
}