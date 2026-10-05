/**
 * Демо-режим: локальная имитация GREEN-API.
 *
 * Реализует тот же интерфейс MessengerApi, что и реальный клиент,
 * поэтому интерфейс не различает режимы. Нужен, чтобы показать
 * прототип без учётных данных.
 */

import type { Notification, WebhookBody } from '../types'
import { formatPhone } from '../utils'
import {
  AbortedError,
  MAX_MESSAGE_LENGTH,
  RECEIVE_TIMEOUT_SECONDS,
  type CheckAccountResult,
  type MessengerApi,
} from './greenApi'

/** Ответы собеседника в демо-режиме. */
const REPLIES = [
  'Привет! Получил твоё сообщение 👋',
  'Это демо-режим — я отвечаю локально, без обращения к MAX.',
  'Чтобы проверить настоящую доставку, включи режим GREEN-API на экране входа.',
  'Всё выглядит как в настоящем MAX, только без сети.',
  'Отлично, текстовое сообщение доставлено.',
  'Проверка связи: я здесь 🙂',
]

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortedError())
      return
    }

    const onAbort = () => {
      clearTimeout(timer)
      reject(new AbortedError())
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Имитация задержки сети, чтобы интерфейс выглядел «живым». */
function latency(min = 220, max = 480): number {
  return min + Math.random() * (max - min)
}

function nextId(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export class MockApi implements MessengerApi {
  private readonly queue: Notification[] = []
  /** Название чата по chatId — чтобы демо выглядел как реальный список чатов. */
  private readonly titles = new Map<string, string>()
  private receiptId = 1
  private replyIndex = 0

  private push(body: WebhookBody): void {
    this.queue.push({ receiptId: this.receiptId, body })
    this.receiptId += 1
  }

  /** Детерминированный «идентификатор чата» на основе номера. */
  private chatIdFor(phone: string): string {
    const base = phone.replace(/\D/g, '').slice(-8)
    return String(10000000 + (Number(base) % 89999999))
  }

  async getStateInstance(): Promise<string> {
    await sleep(320)
    return 'authorized'
  }

  async applyHttpApiSettings(): Promise<void> {
    await sleep(120)
  }

  async checkAccount(phone: string): Promise<CheckAccountResult> {
    await sleep(latency())

    const chatId = this.chatIdFor(phone)
    this.titles.set(chatId, formatPhone(phone) ?? `+${phone}`)

    return { exist: true, chatId, fromCache: false }
  }

  private titleFor(chatId: string): string {
    return this.titles.get(chatId) ?? chatId
  }

  async sendMessage(chatId: string, text: string): Promise<string> {
    await sleep(latency())

    if (!text) throw new Error('Пустое сообщение')
    if (text.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Текст сообщения длиннее ${MAX_MESSAGE_LENGTH} символов.`)
    }

    const idMessage = nextId('out')
    const ownSender = {
      chatId,
      chatName: this.titleFor(chatId),
      chatType: 'user',
      sender: 'own',
      senderName: 'Я',
      senderType: 'user',
      senderContactName: 'Я',
      senderPhoneNumber: 0,
    }

    setTimeout(() => {
      this.push({
        typeWebhook: 'outgoingApiMessage',
        timestamp: Math.floor(Date.now() / 1000),
        idMessage,
        senderData: ownSender,
        messageData: {
          idMessage,
          typeMessage: 'textMessage',
          textMessageData: { textMessage: text },
        },
      })
    }, latency(200, 400))

    setTimeout(() => {
      this.push({
        typeWebhook: 'outgoingMessageStatus',
        timestamp: Math.floor(Date.now() / 1000),
        idMessage,
        status: 'read',
        senderData: ownSender,
        messageData: { idMessage },
      })
    }, latency(700, 1200))

    setTimeout(() => this.pushReply(chatId), latency(2200, 3600))

    return idMessage
  }

  private pushReply(chatId: string): void {
    const reply = REPLIES[this.replyIndex % REPLIES.length]
    const idMessage = nextId('in')
    this.replyIndex += 1

    this.push({
      typeWebhook: 'incomingMessageReceived',
      timestamp: Math.floor(Date.now() / 1000),
      idMessage,
      senderData: {
        chatId,
        chatName: this.titleFor(chatId),
        chatType: 'user',
        sender: chatId,
        senderName: this.titleFor(chatId),
        senderType: 'user',
        senderContactName: this.titleFor(chatId),
        senderPhoneNumber: 79990000000,
      },
      messageData: {
        idMessage,
        typeMessage: 'textMessage',
        textMessageData: { textMessage: reply },
      },
    })
  }

  async receiveNotification(
    receiveTimeoutSeconds: number = RECEIVE_TIMEOUT_SECONDS,
    signal?: AbortSignal,
  ): Promise<Notification | null> {
    const deadline = Date.now() + receiveTimeoutSeconds * 1000

    for (;;) {
      const pending = this.queue.shift()
      if (pending) return pending

      if (signal?.aborted) throw new AbortedError()

      const remaining = deadline - Date.now()
      if (remaining <= 0) return null

      await sleep(Math.min(250, remaining), signal)
    }
  }

  async deleteNotification(_receiptId: number): Promise<void> {
    await sleep(30)
  }
}

export function createMockApi(): MessengerApi {
  return new MockApi()
}