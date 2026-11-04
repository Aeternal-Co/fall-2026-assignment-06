export function Loading({ children = 'Loading…' }: { children?: string }) {
  return (
    <p className="loading-state" role="status">
      <span className="loading-dot" aria-hidden="true" />
      {children}
    </p>
  )
}

export function ErrorNotice({
  message,
  retry,
}: {
  message: string
  retry?: () => void
}) {
  return (
    <div className="notice notice-error" role="alert">
      <p>{message}</p>
      {retry && (
        <button type="button" className="button button-small" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}
