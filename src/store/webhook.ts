/**
 * Преобразование уведомлений GREEN-API в действия хранилища.
 *
 * Поддерживаются только текстовые сообщения, как и требуется в задании.
 */

import type { Message, MessageStatus, Notification, WebhookBody } from '../types'
import { extractText, type ChatAction } from './chatStore'

export interface WebhookResult {
  actions: ChatAction[]
  /** Состояние авторизации инстанса, если пришло сервисное уведомление. */
  instanceState: string | null
}

function idOf(body: WebhookBody): string | null {
  const value = body.idMessage ?? body.messageData?.idMessage
  return typeof value === 'string' && value ? value : null
}

function timeOf(body: WebhookBody): number {
  const seconds =
    typeof body.timestamp === 'number' ? body.timestamp : Math.floor(Date.now() / 1000)
  return seconds * 1000
}

/** Статусы исходящих сообщений → статусы в интерфейсе. */
function mapStatus(raw: string | undefined): MessageStatus | null {
  if (!raw) return null

  switch (raw.toLowerCase()) {
    case 'read':
      return 'read'
    case 'sent':
    case 'delivered':
      return 'sent'
    case 'failed':
      return 'failed'
    default:
      return null
  }
}

export function applyWebhook(
  body: WebhookBody | null,
): WebhookResult {
  if (!body || !body.typeWebhook) {
    return { actions: [], instanceState: null }
  }

  if (body.typeWebhook === 'stateInstance') {
    return {
      actions: [],
      instanceState: body.stateInstance ?? 'unknown',
    }
  }

  const chatId = body.senderData?.chatId

  if (body.typeWebhook === 'incomingMessageReceived') {
    const text = extractText(body.messageData)
    if (!text || !chatId) return { actions: [], instanceState: null }

    const title =
      body.senderData?.chatName ?? body.senderData?.senderContactName ?? undefined

    const message: Message = {
      id: `in:${idOf(body) ?? `${chatId}:${timeOf(body)}`}`,
      apiId: idOf(body),
      chatId,
      text,
      direction: 'in',
      status: 'read',
      timestamp: timeOf(body),
    }

    return {
      instanceState: null,
      actions: [
        { type: 'chat/ensure', chatId, title },
        { type: 'message/add', message },
      ],
    }
  }

  if (body.typeWebhook === 'outgoingApiMessage') {
    const text = extractText(body.messageData)
    if (!text || !chatId) return { actions: [], instanceState: null }

    const apiId = idOf(body)

    const message: Message = {
      id: `out:${apiId ?? `${chatId}:${timeOf(body)}`}`,
      apiId,
      chatId,
      text,
      direction: 'out',
      status: 'sent',
      timestamp: timeOf(body),
    }

    return {
      instanceState: null,
      actions: [
        { type: 'chat/ensure', chatId },
        { type: 'message/add', message },
      ],
    }
  }

  if (body.typeWebhook === 'outgoingMessageStatus') {
    const apiId = idOf(body)
    const status = mapStatus(body.status)
    if (!apiId || !status) return { actions: [], instanceState: null }

    return {
      instanceState: null,
      actions: [{ type: 'message/status', apiId, status }],
    }
  }

  return { actions: [], instanceState: null }
}

export function applyNotification(notification: Notification): WebhookResult {
  return applyWebhook(notification.body)
}