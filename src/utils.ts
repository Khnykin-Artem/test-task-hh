const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

const WEEKDAYS = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
]

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/** Время сообщения: 14:32 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Разделитель дат в ленте: «Сегодня» / «Вчера» / «12 марта» / «12 марта 2025» */
export function formatDayLabel(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime()

  const dayDiff = Math.round((startOfToday - startOfDate) / 86_400_000)

  if (dayDiff === 0) return 'Сегодня'
  if (dayDiff === 1) return 'Вчера'

  const base = `${date.getDate()} ${MONTHS[date.getMonth()]}`
  const sameYear = date.getFullYear() === today.getFullYear()

  return sameYear ? base : `${base} ${date.getFullYear()}`
}

/** Короткое описание последнего сообщения для списка чатов. */
export function formatChatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  if (sameDay) return formatTime(timestamp)

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isYesterday) return 'вчера'

  const base = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`
  return date.getFullYear() === today.getFullYear()
    ? base
    : `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).slice(2)}`
}

export function formatWeekday(timestamp: number): string {
  return WEEKDAYS[new Date(timestamp).getDay()]
}

/**
 * Приводит номер к формату, ожидаемому методом CheckAccount:
 * только цифры, 11 или 12 символов, код страны 7 (РФ) или 375 (РБ).
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7')

  const isValid =
    (digits.length === 11 && digits.startsWith('7')) ||
    (digits.length === 12 && digits.startsWith('375'))

  return isValid ? digits : null
}

/** Красивое отображение номера: +7 999 123-45-67 */
export function formatPhone(phone: string | null): string | null {
  if (!phone) return null

  const digits = phone.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12 && digits.startsWith('375')) {
    return `+375 ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`
  }
  return `+${digits}`
}

/** Инициалы для заглушки аватара. */
export function initials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Обрезка текста с многоточием для предпросмотра в списке чатов. */
export function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`
}

/**
 * Стабильный цвет заглушки аватара — выбирается по строке,
 * чтобы один и тот же контакт всегда выглядел одинаково.
 */
export function avatarColor(seed: string): string {
  const palette = [
    'linear-gradient(135deg, #e56b53, #8d33cc)',
    'linear-gradient(135deg, #394ae5, #6a4dff)',
    'linear-gradient(135deg, #148a8e, #2da334)',
    'linear-gradient(135deg, #d0538f, #8d33cc)',
    'linear-gradient(135deg, #016fe7, #148a8e)',
    'linear-gradient(135deg, #de675a, #d0538f)',
  ]

  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }

  return palette[hash % palette.length]
}