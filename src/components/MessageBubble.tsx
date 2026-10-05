import type { Message } from '../types'
import { formatTime } from '../utils'
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  DoubleCheckIcon,
} from './Icons'

function StatusMark({ message }: { message: Message }) {
  switch (message.status) {
    case 'pending':
      return <ClockIcon className="bubble-status" />
    case 'sent':
      return <CheckIcon className="bubble-status" />
    case 'read':
      return <DoubleCheckIcon className="bubble-status bubble-status-read" />
    case 'failed':
      return <AlertIcon className="bubble-status bubble-status-failed" />
    default:
      return null
  }
}

interface MessageBubbleProps {
  message: Message
  showTail: boolean
  isFirstOfGroup: boolean
}

export function MessageBubble({
  message,
  showTail,
  isFirstOfGroup,
}: MessageBubbleProps) {
  const isOut = message.direction === 'out'

  return (
    <div
      className={`bubble-row ${isOut ? 'bubble-row-out' : 'bubble-row-in'}`}
      data-first={isFirstOfGroup}
    >
      <div className={`bubble ${isOut ? 'bubble-out' : 'bubble-in'}`} data-tail={showTail}>
        <span className="bubble-text">{message.text}</span>
        <span className="bubble-meta">
          <span className="bubble-time">{formatTime(message.timestamp)}</span>
          {isOut ? <StatusMark message={message} /> : null}
        </span>

        {message.status === 'failed' && message.error ? (
          <span className="bubble-error">{message.error}</span>
        ) : null}
      </div>
    </div>
  )
}