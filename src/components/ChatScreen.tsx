import { useEffect, useMemo, useState } from 'react'
import type { Dispatch } from 'react'
import type { ConnectionState } from '../hooks/useNotifications'
import type { ChatAction, ChatState } from '../store/chatStore'
import { selectChats, selectMessages } from '../store/chatStore'
import type { ApiMode } from '../types'
import { avatarColor, formatChatTimestamp, initials, truncate } from '../utils'
import { Composer } from './Composer'
import { ConnectionBanner, type Notice } from './ConnectionBanner'
import { BackIcon, CloseIcon, PlusIcon } from './Icons'
import { MaxLogo } from './MaxLogo'
import { MessageList } from './MessageList'
import { NewChatDialog } from './NewChatDialog'

const MODE_LABEL: Record<ApiMode, string> = {
  demo: 'Демо-режим',
  live: 'GREEN-API',
}

interface ChatScreenProps {
  state: ChatState
  dispatch: Dispatch<ChatAction>
  mode: ApiMode
  connection: ConnectionState
  notice: Notice | null
  onDismissNotice: () => void
  onSend: (chatId: string, text: string) => void
  onNewChat: (phone: string) => Promise<void>
  onSignOut: () => void
}

export function ChatScreen({
  state,
  dispatch,
  mode,
  connection,
  notice,
  onDismissNotice,
  onSend,
  onNewChat,
  onSignOut,
}: ChatScreenProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const chats = useMemo(() => selectChats(state), [state])
  const messages = useMemo(
    () => selectMessages(state, state.activeChatId),
    [state],
  )

  const activeChat = state.activeChatId ? state.chats[state.activeChatId] : null

  useEffect(() => {
    if (state.activeChatId) {
      dispatch({ type: 'chat/read', chatId: state.activeChatId })
    }
  }, [dispatch, state.activeChatId])

  const handleCreateChat = async (phone: string) => {
    setChecking(true)
    setDialogError(null)

    try {
      await onNewChat(phone)
      setDialogOpen(false)
    } catch (error) {
      setDialogError(
        error instanceof Error ? error.message : 'Не удалось создать чат.',
      )
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="app-shell" data-view={activeChat ? 'chat' : 'list'}>
      <aside className="sidebar">
        <header className="sidebar-header">
          <MaxLogo size={30} />
          <span className="sidebar-title">MAX Чат</span>
          <button
            type="button"
            className="icon-button"
            onClick={onSignOut}
            title="Выйти"
            aria-label="Выйти"
          >
            <CloseIcon />
          </button>
        </header>

        <button
          type="button"
          className="button button-primary new-chat-button"
          onClick={() => setDialogOpen(true)}
        >
          <PlusIcon size={18} />
          Новый чат
        </button>

        <div className="chat-list">
          {chats.length === 0 ? (
            <p className="chat-list-empty">
              Чатов пока нет. Нажмите «Новый чат» и укажите номер в MAX.
            </p>
          ) : (
            chats.map((chat) => {
              const last = state.messages[chat.chatId]?.slice(-1)[0]
              const isActive = chat.chatId === state.activeChatId

              return (
                <button
                  key={chat.chatId}
                  type="button"
                  className={`chat-item${isActive ? ' is-active' : ''}`}
                  onClick={() =>
                    dispatch({ type: 'chat/setActive', chatId: chat.chatId })
                  }
                >
                  <span
                    className="avatar"
                    style={{ background: avatarColor(chat.chatId) }}
                    aria-hidden="true"
                  >
                    {initials(chat.title)}
                  </span>

                  <span className="chat-item-body">
                    <span className="chat-item-top">
                      <span className="chat-item-title">{chat.title}</span>
                      {last ? (
                        <span className="chat-item-time">
                          {formatChatTimestamp(last.timestamp)}
                        </span>
                      ) : null}
                    </span>
                    <span className="chat-item-bottom">
                      <span className="chat-item-preview">
                        {last
                          ? `${last.direction === 'out' ? 'Вы: ' : ''}${truncate(
                              last.text,
                              40,
                            )}`
                          : 'Нет сообщений'}
                      </span>
                      {chat.unread > 0 ? (
                        <span className="badge">{chat.unread}</span>
                      ) : null}
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>

        <footer className="sidebar-footer">
          <span className={`dot dot-${mode}`} />
          {MODE_LABEL[mode]}
        </footer>
      </aside>

      <main className="chat">
        <ConnectionBanner
          connection={connection}
          notice={notice}
          onDismiss={onDismissNotice}
        />

        {activeChat ? (
          <>
            <header className="chat-header">
              <button
                type="button"
                className="icon-button chat-back"
                onClick={() => dispatch({ type: 'chat/setActive', chatId: null })}
                aria-label="Назад к чатам"
              >
                <BackIcon />
              </button>

              <span
                className="avatar avatar-sm"
                style={{ background: avatarColor(activeChat.chatId) }}
                aria-hidden="true"
              >
                {initials(activeChat.title)}
              </span>

              <span className="chat-header-info">
                <span className="chat-header-title">{activeChat.title}</span>
                <span className="chat-header-subtitle">
                  {activeChat.phone ? `+${activeChat.phone}` : activeChat.chatId}
                </span>
              </span>

              <span
                className={`status-dot status-dot-${connection}`}
                title={
                  connection === 'online'
                    ? 'Получение уведомлений активно'
                    : 'Ожидание уведомлений'
                }
              />
            </header>

            <MessageList
              messages={messages}
              emptyHint="Сообщений пока нет. Напишите первое — ответ придёт через GREEN-API."
            />

            <Composer
              disabled={connection === 'error'}
              placeholder="Напишите сообщение…"
              onSend={(text) => onSend(activeChat.chatId, text)}
            />
          </>
        ) : (
          <div className="empty-state">
            <MaxLogo size={72} />
            <h2>Выберите чат</h2>
            <p>
              Откройте существующий чат или создайте новый по номеру телефона.
              Сообщения отправляются методом <code>SendMessage</code>, входящие
              приходят через <code>ReceiveNotification</code>.
            </p>
          </div>
        )}
      </main>

      <NewChatDialog
        open={dialogOpen}
        busy={checking}
        error={dialogError}
        onClose={() => setDialogOpen(false)}
        onSubmit={(phone) => void handleCreateChat(phone)}
      />
    </div>
  )
}