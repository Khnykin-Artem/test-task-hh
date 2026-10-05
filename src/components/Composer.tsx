import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { MAX_MESSAGE_LENGTH } from '../api/greenApi'
import { SendIcon } from './Icons'

const MAX_TEXTAREA_HEIGHT = 160

interface ComposerProps {
  disabled: boolean
  placeholder: string
  onSend: (text: string) => void
}

export function Composer({ disabled, placeholder, onSend }: ComposerProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return

    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [text])

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return

    onSend(trimmed)
    setText('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  const overflow = text.length > MAX_MESSAGE_LENGTH
  const showCounter = text.length > MAX_MESSAGE_LENGTH * 0.9

  return (
    <div className="composer">
      <div className="composer-inner">
        <textarea
          ref={textareaRef}
          className="composer-input"
          value={text}
          rows={1}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Текст сообщения"
        />

        <button
          type="button"
          className="composer-send"
          onClick={submit}
          disabled={disabled || !text.trim() || overflow}
          aria-label="Отправить"
          title="Отправить (Enter)"
        >
          <SendIcon />
        </button>
      </div>

      {showCounter ? (
        <div className={`composer-counter${overflow ? ' is-overflow' : ''}`}>
          {text.length} / {MAX_MESSAGE_LENGTH}
        </div>
      ) : null}
    </div>
  )
}