/**
 * Клиент GREEN-API для мессенджера MAX.
 *
 * Отправка:  POST   {apiUrl}/waInstance{id}/SendMessage/{token}
 * Получение: GET    {apiUrl}/waInstance{id}/ReceiveNotification/{token}
 * Удаление:  DELETE {apiUrl}/waInstance{id}/DeleteNotification/{token}/{receiptId}
 *
 * Документация: https://green-api.com/v3/docs/
 */

import type { Credentials, Notification, WebhookBody } from '../types'

export const DEFAULT_API_URL = 'https://api.green-api.com'

/** Максимальная длина текстового сообщения по документации SendMessage. */
export const MAX_MESSAGE_LENGTH = 4000

/** Таймаут ожидания уведомления: допустимый диапазон 5..60 секунд. */
export const RECEIVE_TIMEOUT_SECONDS = 25

export interface CheckAccountResult {
  exist: boolean
  chatId: string
  fromCache: boolean
}

/** Настройки, необходимые для работы HTTP API. */
export interface HttpApiSettings {
  webhookUrl: string
  incomingWebhook: string
  outgoingWebhook: string
  stateWebhook: string
}

export interface MessengerApi {
  /** Проверка учётных данных и состояние авторизации инстанса. */
  getStateInstance(): Promise<string>
  /** Включает получение уведомлений по HTTP API. */
  applyHttpApiSettings(): Promise<void>
  /** Резолвит номер телефона в chatId. */
  checkAccount(phone: string): Promise<CheckAccountResult>
  /** Отправляет текстовое сообщение, возвращает idMessage. */
  sendMessage(chatId: string, text: string): Promise<string>
  /** Забирает одно уведомление; null — очередь пуста (таймаут). */
  receiveNotification(
    receiveTimeoutSeconds: number,
    signal?: AbortSignal,
  ): Promise<Notification | null>
  /** Подтверждает обработку уведомления. */
  deleteNotification(receiptId: number): Promise<void>
}

export class GreenApiError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GreenApiError'
    this.status = status
  }
}

export class AbortedError extends Error {
  constructor() {
    super('Запрос отменён')
    this.name = 'AbortedError'
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof AbortedError ||
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

/** Человекочитаемые подсказки для типичных ответов API. */
const ERROR_HINTS: Array<[RegExp, string]> = [
  [
    /Parameter idInstance not an integer/i,
    'idInstance должен быть числом. Проверьте значение в личном кабинете.',
  ],
  [
    /Parameter apiTokenInstance not define/i,
    'Не передан apiTokenInstance.',
  ],
  [
    /Unauthorized|not authorized|wrong token/i,
    'Неверный apiTokenInstance или инстанс не авторизован в MAX.',
  ],
  [
    /custom webhook url is set/i,
    'У инстанса задан webhookUrl. Очистите его в личном кабинете — иначе уведомления недоступны через HTTP API.',
  ],
  [
    /instance is starting or not authorized/i,
    'Инстанс не авторизован или ещё запускается. Авторизуйте его в личном кабинете.',
  ],
  [
    /must contain only digits|bad phone number/i,
    'Номер телефона должен содержать 11 или 12 цифр.',
  ],
  [
    /contact info limit reached/i,
    'Слишком много проверок номера. Приостановите проверки примерно на 2 часа.',
  ],
  [
    /Your account is suspended/i,
    'Аккаунт временно ограничен мессенджером MAX.',
  ],
  [
    /length must be less than or equal to 4000/i,
    `Текст сообщения длиннее ${MAX_MESSAGE_LENGTH} символов.`,
  ],
]

function humanize(rawText: string, status: number): string {
  const forHint = ERROR_HINTS.find(([pattern]) => pattern.test(rawText))
  if (forHint) return forHint[1]

  const trimmed = rawText.trim()
  if (trimmed && trimmed.length <= 300 && !trimmed.startsWith('<')) {
    return trimmed
  }

  return `Ошибка GREEN-API (HTTP ${status})`
}

/** Разбирает тело ответа с ошибкой: JSON либо текст. */
async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')

  if (!text) return `Ошибка GREEN-API (HTTP ${response.status})`

  try {
    const parsed: unknown = JSON.parse(text)

    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>
      const candidate =
        record.reason ?? record.message ?? record.error ?? record.details

      if (typeof candidate === 'string' && candidate) {
        return humanize(candidate, response.status)
      }
    }
  } catch {
    // тело не является JSON — используем как есть
  }

  return humanize(text, response.status)
}

export class GreenApi implements MessengerApi {
  private readonly credentials: Credentials

  constructor(credentials: Credentials) {
    this.credentials = credentials
  }

  private url(method: string, tail = ''): string {
    const base = this.credentials.apiUrl.replace(/\/+$/, '')
    const { idInstance, apiTokenInstance } = this.credentials
    return `${base}/waInstance${idInstance}/${method}/${apiTokenInstance}${tail}`
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    url: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    let response: Response

    try {
      response = await fetch(url, {
        method,
        signal,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (error) {
      if (isAbortError(error)) throw new AbortedError()
      throw new GreenApiError('Нет связи с GREEN-API. Проверьте подключение к сети.')
    }

    if (!response.ok) {
      throw new GreenApiError(await readError(response), response.status)
    }

    const text = await response.text().catch(() => '')

    if (!text.trim()) return null as T

    try {
      return JSON.parse(text) as T
    } catch {
      throw new GreenApiError('GREEN-API вернул ответ в неожиданном формате.')
    }
  }

  async getStateInstance(): Promise<string> {
    const data = await this.request<{ stateInstance?: string }>(
      'GET',
      this.url('GetStateInstance'),
    )
    return data?.stateInstance ?? 'unknown'
  }

  async applyHttpApiSettings(): Promise<void> {
    const settings: HttpApiSettings = {
      // Пустой webhookUrl переводит инстанс в режим HTTP API.
      webhookUrl: '',
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
      stateWebhook: 'yes',
    }

    await this.request<unknown>('POST', this.url('SetSettings'), settings)
  }

  async checkAccount(phone: string): Promise<CheckAccountResult> {
    const data = await this.request<
      | CheckAccountResult
      | { status: false; reason: string }
    >('POST', this.url('CheckAccount'), { phoneNumber: Number(phone) })

    if (data && typeof data === 'object' && 'status' in data && !data.status) {
      throw new GreenApiError(data.reason || 'Инстанс не готов к работе.')
    }

    const result = data as CheckAccountResult
    return {
      exist: Boolean(result?.exist),
      chatId: result?.chatId ?? '',
      fromCache: Boolean(result?.fromCache),
    }
  }

  async sendMessage(chatId: string, text: string): Promise<string> {
    const data = await this.request<{ idMessage?: string }>(
      'POST',
      this.url('SendMessage'),
      { chatId, message: text },
    )

    const idMessage = data?.idMessage

    if (!idMessage) {
      throw new GreenApiError(
        'GREEN-API не вернул идентификатор отправленного сообщения.',
      )
    }

    return idMessage
  }

  async receiveNotification(
    receiveTimeoutSeconds: number = RECEIVE_TIMEOUT_SECONDS,
    signal?: AbortSignal,
  ): Promise<Notification | null> {
    const query = `?receiveTimeout=${receiveTimeoutSeconds}`
    const data = await this.request<Notification | null>(
      'GET',
      this.url('ReceiveNotification') + query,
      undefined,
      signal,
    )

    // Пустой ответ — очередь уведомлений пуста.
    if (!data || typeof data !== 'object') return null
    if (typeof data.receiptId !== 'number') return null

    return {
      receiptId: data.receiptId,
      body: (data.body ?? null) as WebhookBody | null,
    }
  }

  async deleteNotification(receiptId: number): Promise<void> {
    await this.request<unknown>(
      'DELETE',
      this.url('DeleteNotification', `/${receiptId}`),
    )
  }
}