/**
 * Состояние чатов и сообщений. Уведомления GREEN-API сводятся в него
 * через единственную точку входа — редьюсер.
 */

import type { Chat, Message, MessageStatus } from '../types'

export interface ChatState {
  chats: Record<string, Chat>
  messages: Record<string, Message[]>
  activeChatId: string | null
}

export const initialState: ChatState = {
  chats: {},
  messages: {},
  activeChatId: null,
}

export type ChatAction =
  /** Создаёт чат, если его ещё нет, и обновляет название при наличии. */
  | { type: 'chat/ensure'; chatId: string; title?: string; phone?: string | null }
  | { type: 'chat/setActive'; chatId: string | null }
  | { type: 'chat/rename'; chatId: string; title: string }
  | { type: 'chat/read'; chatId: string }
  | { type: 'chat/remove'; chatId: string }
  | { type: 'message/add'; message: Message }
  /** Привязывает оптимистичное сообщение к idMessage от API. */
  | { type: 'message/confirm'; chatId: string; localId: string; apiId: string }
  | { type: 'message/status'; apiId: string; status: MessageStatus }
  | { type: 'message/fail'; chatId: string; localId: string; error: string }
  | { type: 'reset' }

function byTimestamp(a: Message, b: Message): number {
  return a.timestamp - b.timestamp
}

function withMessages(
  state: ChatState,
  chatId: string,
  update: (list: Message[]) => Message[],
): ChatState {
  const current = state.messages[chatId] ?? []
  return { ...state, messages: { ...state.messages, [chatId]: update(current) } }
}

/** Читает текст уведомления, если это текстовое сообщение. */
function textOf(message: { textMessage?: string } | undefined): string | null {
  const text = message?.textMessage
  return typeof text === 'string' && text.length > 0 ? text : null
}

/** Ищет сообщение по apiMessage во всех чатах. */
function findByApiId(
  state: ChatState,
  apiId: string,
): { chatId: string; message: Message } | null {
  for (const [chatId, list] of Object.entries(state.messages)) {
    const message = list.find((item) => item.apiId === apiId)
    if (message) return { chatId, message }
  }
  return null
}

function ensureChat(
  state: ChatState,
  chatId: string,
  title?: string,
  phone?: string | null,
): ChatState {
  const existing = state.chats[chatId]

  if (!existing) {
    return {
      ...state,
      chats: {
        ...state.chats,
        [chatId]: {
          chatId,
          title: title ?? phone ?? chatId,
          phone: phone ?? null,
          lastActivity: Date.now(),
          unread: 0,
        },
      },
      messages: { ...state.messages, [chatId]: state.messages[chatId] ?? [] },
    }
  }

  if (!title || title === existing.title) {
    return {
      ...state,
      chats: {
        ...state.chats,
        [chatId]: { ...existing, phone: phone ?? existing.phone },
      },
    }
  }

  return {
    ...state,
    chats: {
      ...state.chats,
      [chatId]: { ...existing, title, phone: phone ?? existing.phone },
    },
  }
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chat/ensure': {
      return ensureChat(state, action.chatId, action.title, action.phone)
    }

    case 'chat/setActive': {
      if (!action.chatId || !state.chats[action.chatId]) {
        return { ...state, activeChatId: null }
      }
      return { ...state, activeChatId: action.chatId }
    }

    case 'chat/rename': {
      const chat = state.chats[action.chatId]
      if (!chat || chat.title === action.title) return state
      return {
        ...state,
        chats: { ...state.chats, [action.chatId]: { ...chat, title: action.title } },
      }
    }

    case 'chat/read': {
      const chat = state.chats[action.chatId]
      if (!chat || chat.unread === 0) return state
      return {
        ...state,
        chats: { ...state.chats, [action.chatId]: { ...chat, unread: 0 } },
      }
    }

    case 'chat/remove': {
      const { [action.chatId]: _removedChat, ...chats } = state.chats
      const { [action.chatId]: _removedMessages, ...messages } = state.messages
      return {
        chats,
        messages,
        activeChatId:
          state.activeChatId === action.chatId ? null : state.activeChatId,
      }
    }

    case 'message/add': {
      const { message } = action

      let next = ensureChat(state, message.chatId)
      const list = next.messages[message.chatId] ?? []

      // Защита от дублей: одно и то же уведомление может прийти повторно.
      if (message.apiId && list.some((item) => item.apiId === message.apiId)) {
        return state
      }

      const chat = next.chats[message.chatId]
      const isActive = next.activeChatId === message.chatId

      next = {
        ...next,
        chats: {
          ...next.chats,
          [message.chatId]: {
            ...chat,
            lastActivity: message.timestamp,
            unread: message.direction === 'in' && !isActive ? chat.unread + 1 : chat.unread,
          },
        },
        messages: {
          ...next.messages,
          [message.chatId]: [...list, message].sort(byTimestamp),
        },
      }

      return next
    }

    case 'message/confirm': {
      const { chatId, localId, apiId } = action
      const list = state.messages[chatId] ?? []
      const exists = list.some((item) => item.apiId === apiId)

      return withMessages(state, chatId, (current) => {
        if (exists) return current
        return current.map((item) =>
          item.id === localId ? { ...item, apiId, status: 'sent' } : item,
        )
      })
    }

    case 'message/status': {
      const found = findByApiId(state, action.apiId)
      if (!found) return state

      return withMessages(state, found.chatId, (list) =>
        list.map((item) =>
          item.apiId === action.apiId ? { ...item, status: action.status } : item,
        ),
      )
    }

    case 'message/fail': {
      const { chatId, localId, error } = action
      return withMessages(state, chatId, (list) =>
        list.map((item) =>
          item.id === localId ? { ...item, status: 'failed', error } : item,
        ),
      )
    }

    case 'reset': {
      return initialState
    }

    default: {
      return state
    }
  }
}

/** Чаты в порядке последней активности. */
export function selectChats(state: ChatState): Chat[] {
  return Object.values(state.chats).sort((a, b) => b.lastActivity - a.lastActivity)
}

export function selectMessages(state: ChatState, chatId: string | null): Message[] {
  if (!chatId) return []
  return state.messages[chatId] ?? []
}

export function selectUnreadTotal(state: ChatState): number {
  return Object.values(state.chats).reduce((sum, chat) => sum + chat.unread, 0)
}

/** Текст уведомления: только текстовые сообщения. */
export function extractText(messageData: {
  typeMessage?: string
  textMessageData?: { textMessage?: string }
} | undefined): string | null {
  if (!messageData) return null
  if (messageData.typeMessage && messageData.typeMessage !== 'textMessage') {
    return null
  }
  return textOf(messageData.textMessageData)
}