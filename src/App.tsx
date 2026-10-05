import { useCallback, useMemo, useReducer, useState } from 'react'
import { GreenApi } from './api/greenApi'
import { createMockApi } from './api/mockApi'
import { AuthScreen } from './components/AuthScreen'
import { ChatScreen } from './components/ChatScreen'
import type { Notice } from './components/ConnectionBanner'
import { useNotifications } from './hooks/useNotifications'
import { useSession } from './hooks/useSession'
import { chatReducer, initialState } from './store/chatStore'
import { applyWebhook } from './store/webhook'
import type { Credentials, Notification } from './types'

function localMessageId(): string {
  return `local:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
}

function reasonOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Неизвестная ошибка GREEN-API.'
}

export function App() {
  const { session, signInLive, signInDemo, signOut } = useSession()
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const [notice, setNotice] = useState<Notice | null>(null)

  const api = useMemo(() => {
    if (!session) return null
    if (session.mode === 'demo') return createMockApi()
    return new GreenApi(session.credentials)
  }, [session])

  const handleNotification = useCallback((notification: Notification) => {
    const { actions, instanceState } = applyWebhook(notification.body)

    for (const action of actions) {
      dispatch(action)
    }

    if (instanceState && instanceState !== 'authorized') {
      setNotice({ kind: 'warning', text: `Состояние инстанса: ${instanceState}.` })
    }
  }, [])

  const handlePollingError = useCallback((message: string) => {
    setNotice((current) =>
      current?.text === message ? current : { kind: 'error', text: message },
    )
  }, [])

  const connection = useNotifications({
    api,
    onNotification: handleNotification,
    onError: handlePollingError,
  })

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      if (!api) return

      const localId = localMessageId()

      // Оптимистичное сообщение: пользователь не ждёт ответа API.
      dispatch({
        type: 'message/add',
        message: {
          id: localId,
          apiId: null,
          chatId,
          text,
          direction: 'out',
          status: 'pending',
          timestamp: Date.now(),
        },
      })

      try {
        const apiId = await api.sendMessage(chatId, text)
        dispatch({ type: 'message/confirm', chatId, localId, apiId })
      } catch (error) {
        const reason = reasonOf(error)
        dispatch({ type: 'message/fail', chatId, localId, error: reason })
        setNotice({ kind: 'error', text: reason })
      }
    },
    [api],
  )

  const createChat = useCallback(
    async (phone: string) => {
      if (!api) throw new Error('Нет подключения к GREEN-API.')

      const account = await api.checkAccount(phone)

      if (!account.exist || !account.chatId) {
        throw new Error(`Аккаунт +${phone} не найден в MAX.`)
      }

      dispatch({ type: 'chat/ensure', chatId: account.chatId, phone })
      dispatch({ type: 'chat/setActive', chatId: account.chatId })
    },
    [api],
  )

  const handleSignIn = useCallback(
    (credentials: Credentials) => {
      setNotice(null)
      signInLive(credentials)
    },
    [signInLive],
  )

  const handleSignOut = useCallback(() => {
    setNotice(null)
    dispatch({ type: 'reset' })
    signOut()
  }, [signOut])

  if (!session) {
    return <AuthScreen onSignIn={handleSignIn} onSignInDemo={signInDemo} />
  }

  return (
    <ChatScreen
      state={state}
      dispatch={dispatch}
      mode={session.mode}
      connection={connection}
      notice={notice}
      onDismissNotice={() => setNotice(null)}
      onSend={(chatId, text) => void sendMessage(chatId, text)}
      onNewChat={createChat}
      onSignOut={handleSignOut}
    />
  )
}