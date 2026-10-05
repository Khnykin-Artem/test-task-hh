/**
 * Цикл получения уведомлений по технологии HTTP API GREEN-API.
 *
 * ReceiveNotification удерживает соединение до 60 секунд в ожидании
 * уведомления, поэтому цикл выполняет один запрос за раз и подтверждает
 * каждое уведомление через DeleteNotification.
 */

import { useEffect, useRef, useState } from 'react'
import { isAbortError, RECEIVE_TIMEOUT_SECONDS } from '../api/greenApi'
import type { MessengerApi } from '../api/greenApi'
import type { Notification } from '../types'

export type ConnectionState = 'idle' | 'connecting' | 'online' | 'error'

/** Пауза между неудачными попытками, прерываемая при остановке цикла. */
const RETRY_DELAY_MS = 4000

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'))
      return
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(new Error('aborted'))
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Неизвестная ошибка при получении уведомлений.'
}

interface UseNotificationsOptions {
  api: MessengerApi | null
  onNotification: (notification: Notification) => void
  onError: (message: string) => void
}

export function useNotifications({ api, onNotification, onError }: UseNotificationsOptions) {
  const [connection, setConnection] = useState<ConnectionState>('idle')

  // Колбэки храним в ref, чтобы смена обработчика не перезапускала цикл.
  const handlers = useRef({ onNotification, onError })

  useEffect(() => {
    handlers.current = { onNotification, onError }
  })

  useEffect(() => {
    if (!api) {
      setConnection('idle')
      return
    }

    const controller = new AbortController()
    let stopped = false

    setConnection('connecting')

    const run = async () => {
      while (!stopped) {
        let notification: Notification | null = null

        try {
          notification = await api.receiveNotification(
            RECEIVE_TIMEOUT_SECONDS,
            controller.signal,
          )
        } catch (error) {
          if (stopped || isAbortError(error)) return

          setConnection('error')
          handlers.current.onError(errorMessage(error))

          try {
            await abortableDelay(RETRY_DELAY_MS, controller.signal)
          } catch {
            return
          }
          continue
        }

        if (stopped) return
        setConnection('online')

        if (!notification) continue

        try {
          handlers.current.onNotification(notification)
        } finally {
          try {
            await api.deleteNotification(notification.receiptId)
          } catch {
            // Уведомление подтвердить не удалось — оно вернётся в очередь.
          }
        }
      }
    }

    void run()

    return () => {
      stopped = true
      controller.abort()
    }
  }, [api])

  return connection
}