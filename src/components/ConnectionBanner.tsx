import type { ConnectionState } from '../hooks/useNotifications'
import { AlertIcon, CloseIcon } from './Icons'

export interface Notice {
  kind: 'error' | 'warning' | 'info'
  text: string
}

interface ConnectionBannerProps {
  connection: ConnectionState
  notice: Notice | null
  onDismiss: () => void
}

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  idle: 'Не подключено',
  connecting: 'Подключение к GREEN-API…',
  online: 'Получение уведомлений активно',
  error: 'Связь с GREEN-API потеряна, переподключаемся…',
}

export function ConnectionBanner({
  connection,
  notice,
  onDismiss,
}: ConnectionBannerProps) {
  if (!notice && connection !== 'error') return null

  return (
    <div className="banners">
      {connection === 'error' && !notice ? (
        <div className="banner banner-error">
          <AlertIcon size={16} />
          <span>{CONNECTION_LABEL.error}</span>
        </div>
      ) : null}

      {notice ? (
        <div className={`banner banner-${notice.kind}`}>
          {notice.kind === 'info' ? null : <AlertIcon size={16} />}
          <span>{notice.text}</span>
          <button type="button" className="banner-close" onClick={onDismiss} aria-label="Скрыть">
            <CloseIcon size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}