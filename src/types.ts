/**
 * Типы уведомлений и данных GREEN-API (API мессенджера MAX)
 * https://green-api.com/v3/docs/
 */

export type ApiMode = 'live' | 'demo'

export interface Credentials {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
}

export interface InstanceData {
  idInstance?: number
  wid?: string
  typeInstance?: string
}

export interface SenderData {
  chatId?: string
  chatName?: string
  chatType?: string
  sender?: string
  senderName?: string
  senderType?: string
  senderContactName?: string
  senderPhoneNumber?: number | string
}

export interface TextMessageData {
  textMessage?: string
  isForwarded?: boolean
  forwardingScore?: number
}

export interface MessageData {
  idMessage?: string
  typeMessage?: string
  textMessageData?: TextMessageData
}

/** Тело уведомления. Все поля необязательные: состав зависит от typeWebhook. */
export interface WebhookBody {
  typeWebhook?: string
  instanceData?: InstanceData
  timestamp?: number
  idMessage?: string
  senderData?: SenderData
  messageData?: MessageData
  status?: string
  stateInstance?: string
  reason?: string
}

/** Ответ метода ReceiveNotification. */
export interface Notification {
  receiptId: number
  body: WebhookBody | null
}

/* ------------------------------------------------------------------ */
/* Модель приложения                                                   */
/* ------------------------------------------------------------------ */

export type MessageDirection = 'in' | 'out'

export type MessageStatus = 'pending' | 'sent' | 'read' | 'failed'

export interface Message {
  /** Внутренний идентификатор: для оптимистичных сообщений — временный. */
  id: string
  /** Идентификатор сообщения от GREEN-API (idMessage). */
  apiId: string | null
  chatId: string
  text: string
  direction: MessageDirection
  status: MessageStatus
  /** Метка времени в миллисекундах. */
  timestamp: number
  /** Текст последней ошибки отправки. */
  error?: string
}

export interface Chat {
  chatId: string
  title: string
  phone: string | null
  lastActivity: number
  unread: number
}

export type Session =
  | { mode: 'demo'; credentials: null }
  | { mode: 'live'; credentials: Credentials }