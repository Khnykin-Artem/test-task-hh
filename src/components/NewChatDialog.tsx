import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { normalizePhone } from '../utils'
import { CloseIcon } from './Icons'

interface NewChatDialogProps {
  open: boolean
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (phone: string) => void
}

export function NewChatDialog({
  open,
  busy,
  error,
  onClose,
  onSubmit,
}: NewChatDialogProps) {
  const [phone, setPhone] = useState('')
  const [validation, setValidation] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPhone('')
      setValidation(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onClose])

  if (!open) return null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const normalized = normalizePhone(phone)

    if (!normalized) {
      setValidation('Нужен номер в международном формате: 11 цифр для РФ (7…) или 12 для РБ (375…).')
      return
    }

    setValidation(null)
    onSubmit(normalized)
  }

  const hint = normalizePhone(phone)

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !busy && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="new-chat-title">Новый чат</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Закрыть"
          >
            <CloseIcon />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Номер телефона в MAX</span>
            <input
              className="field-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="79991234567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={busy}
              autoFocus
            />
          </label>

          <p className="field-hint">
            Метод <code>CheckAccount</code> проверит наличие аккаунта и вернёт{' '}
            <code>chatId</code>.{hint ? ` Распознан как +${hint}.` : ''}
          </p>

          {validation ? <p className="alert alert-error">{validation}</p> : null}
          {error ? <p className="alert alert-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={onClose}
              disabled={busy}
            >
              Отмена
            </button>
            <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? 'Проверяем…' : 'Создать чат'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}