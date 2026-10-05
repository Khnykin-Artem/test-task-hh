interface MaxLogoProps {
  size?: number
  withWordmark?: boolean
}

/** Логотип MAX: скруглённый квадрат с фирменным градиентом. */
export function MaxLogo({ size = 40, withWordmark = false }: MaxLogoProps) {
  return (
    <span className="max-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 70 70"
        fill="none"
        role="img"
        aria-label="MAX"
      >
        <defs>
          <linearGradient id="maxGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e56b53" />
            <stop offset="0.5" stopColor="#8d33cc" />
            <stop offset="1" stopColor="#394ae5" />
          </linearGradient>
        </defs>
        <rect width="70" height="70" rx="18" fill="url(#maxGradient)" />
        <path
          fill="#fff"
          d="M35 13c-12.15 0-22 8.13-22 18.16 0 5.72 3.15 10.77 8.05 14.05.41.28.63.77.56 1.25l-1.24 8.3c-.09.6.5 1.09 1.07.89l11.6-4.06c.47-.16.98-.2 1.48-.09 1.1.28 2.24.43 3.43.43 12.15 0 22-8.13 22-18.16S47.15 13 35 13z"
        />
      </svg>

      {withWordmark ? (
        <span className="max-wordmark">
          MAX
          <span className="max-wordmark-accent">Чат</span>
        </span>
      ) : null}
    </span>
  )
}