import { useState } from 'react'
import type { FormEvent } from 'react'
import { DEFAULT_API_URL, GreenApi } from '../api/greenApi'
import type { Credentials } from '../types'
import { MaxLogo } from './MaxLogo'

type Mode = 'live' | 'demo'

interface AuthScreenProps {
  onSignIn: (credentials: Credentials) => void
  onSignInDemo: () => void
}

function describeState(state: string): string {
  switch (state) {
    case 'authorized':
      return 'Инстанс авторизован в MAX.'
    case 'notAuthorized':
      return 'Инстанс не авторизован. Отсканируйте QR-код или войдите в MAX в личном кабинете GREEN-API.'
    case 'starting':
      return 'Инстанс запускается. Повторите попытку через минуту.'
    case 'deleted':
      return 'Инстанс удалён.'
    case 'suspended':
      return 'Аккаунт MAX заблокирован.'
    default:
      return `Состояние инстанса: ${state}.`
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Не удалось проверить учётные данные.'
}

export function AuthScreen({ onSignIn, onSignInDemo }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('live')
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [applySettings, setApplySettings] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [canForce, setCanForce] = useState(false)

  const credentials: Credentials = {
    idInstance: idInstance.trim(),
    apiTokenInstance: apiTokenInstance.trim(),
    apiUrl: apiUrl.trim() || DEFAULT_API_URL,
  }

  const enter = async (allowUnauthorized: boolean) => {
    setError(null)
    setWarning(null)
    setBusy(true)

    try {
      const api = new GreenApi(credentials)
      const state = await api.getStateInstance()

      if (state !== 'authorized' && !allowUnauthorized) {
        setWarning(describeState(state))
        setCanForce(true)
        setBusy(false)
        return
      }

      if (state !== 'authorized' && allowUnauthorized) {
        setWarning(describeState(state))
      }

      if (applySettings && state === 'authorized') {
        try {
          // Пустой webhookUrl включает режим получения по HTTP API.
          await api.applyHttpApiSettings()
        } catch (settingsError) {
          setWarning(
            `Не удалось применить настройки получения уведомлений: ${errorMessage(
              settingsError,
            )}`,
          )
        }
      }

      onSignIn(credentials)
    } catch (validationError) {
      setError(errorMessage(validationError))
      setCanForce(false)
      setBusy(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (!/^\d+$/.test(credentials.idInstance)) {
      setError('idInstance — положительное число, например 3100000001.')
      return
    }

    if (!credentials.apiTokenInstance) {
      setError('Укажите apiTokenInstance.')
      return
    }

    void enter(false)
  }

  if (mode === 'demo') {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <MaxLogo size={56} />
          <h1 className="auth-title">MAX Чат</h1>
          <p className="auth-subtitle">
            Демо-режим: интерфейс работает без учётных данных GREEN-API, ответы
            собеседника генерируются локально.
          </p>

          <ul className="auth-list">
            <li>Отправка и приём текстовых сообщений</li>
            <li>Статусы доставки и прочтения</li>
            <li>Внешний вид как в web.max.ru</li>
          </ul>

          <button type="button" className="button button-primary button-lg" onClick={onSignInDemo}>
            Открыть демо-чат
          </button>

          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              setMode('live')
              setError(null)
              setWarning(null)
            }}
          >
            Войти через GREEN-API
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <MaxLogo size={56} />
        <h1 className="auth-title">Вход в MAX Чат</h1>
        <p className="auth-subtitle">
          Учётные данные инстанса из личного кабинета GREEN-API. Они хранятся
          только в вашем браузере.
        </p>

        <label className="field">
          <span className="field-label">idInstance</span>
          <input
            className="field-input"
            type="text"
            inputMode="numeric"
            placeholder="3100000001"
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            disabled={busy}
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field-label">apiTokenInstance</span>
          <input
            className="field-input"
            type="text"
            placeholder="d75b3a66…"
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            disabled={busy}
          />
        </label>

        <button
          type="button"
          className="auth-link"
          onClick={() => setShowAdvanced((value) => !value)}
        >
          {showAdvanced ? 'Скрыть' : 'Показать'} адрес API
        </button>

        {showAdvanced ? (
          <label className="field">
            <span className="field-label">apiUrl</span>
            <input
              className="field-input"
              type="url"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              disabled={busy}
            />
          </label>
        ) : null}

        <label className="checkbox">
          <input
            type="checkbox"
            checked={applySettings}
            onChange={(event) => setApplySettings(event.target.checked)}
            disabled={busy}
          />
          <span>
            Включить получение уведомлений (<code>SetSettings</code>)
          </span>
        </label>

        {error ? <p className="alert alert-error">{error}</p> : null}
        {warning ? <p className="alert alert-warning">{warning}</p> : null}

        <button type="submit" className="button button-primary button-lg" disabled={busy}>
          {busy ? 'Проверяем…' : 'Войти'}
        </button>

        {canForce ? (
          <button
            type="button"
            className="button button-ghost"
            onClick={() => void enter(true)}
            disabled={busy}
          >
            Войти без проверки состояния
          </button>
        ) : null}

        <div className="auth-divider">
          <span>или</span>
        </div>

        <button
          type="button"
          className="button button-ghost"
          onClick={() => setMode('demo')}
          disabled={busy}
        >
          Открыть демо-режим
        </button>

        <p className="auth-note">
          Данные инстанса:{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            console.green-api.com
          </a>
        </p>
      </form>
    </div>
  )
}