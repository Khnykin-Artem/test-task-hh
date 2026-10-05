import { useEffect, useRef } from 'react'
import type { Message } from '../types'
import { formatDayLabel } from '../utils'
import { MessageBubble } from './MessageBubble'

interface MessageListProps {
  messages: Message[]
  emptyHint: string
}

interface Segment {
  key: string
  dayLabel: string | null
  items: { message: Message; showTail: boolean; isFirstOfGroup: boolean }[]
}

/** Разбивает ленту на дни и на группы подряд идущих сообщений одного направления. */
function buildSegments(messages: Message[]): Segment[] {
  const segments: Segment[] = []

  messages.forEach((message, index) => {
    const previous = messages[index - 1]

    const newDay =
      !previous ||
      new Date(previous.timestamp).toDateString() !==
        new Date(message.timestamp).toDateString()

    if (newDay || !segments.length) {
      segments.push({
        key: `${message.id}:day`,
        dayLabel: formatDayLabel(message.timestamp),
        items: [],
      })
    }

    const current = segments[segments.length - 1]

    const isFirstOfGroup =
      newDay || !previous || previous.direction !== message.direction

    // Хвост показываем только у последнего сообщения в группе.
    const next = messages[index + 1]
    const isLastOfGroup = !next || next.direction !== message.direction ||
      new Date(next.timestamp).toDateString() !==
        new Date(message.timestamp).toDateString()

    current.items.push({ message, showTail: isLastOfGroup, isFirstOfGroup })
  })

  return segments
}

export function MessageList({ messages, emptyHint }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const segments = buildSegments(messages)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="message-list message-list-empty">
        <p>{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="message-list">
      <div className="message-list-inner">
        {segments.map((segment) => (
          <div key={segment.key} className="message-segment">
            {segment.dayLabel ? (
              <div className="day-divider">
                <span className="day-divider-chip">{segment.dayLabel}</span>
              </div>
            ) : null}

            {segment.items.map((item) => (
              <MessageBubble
                key={item.message.id}
                message={item.message}
                showTail={item.showTail}
                isFirstOfGroup={item.isFirstOfGroup}
              />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}