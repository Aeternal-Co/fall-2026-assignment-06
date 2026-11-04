import { useEffect, useState } from 'react'
import { errorMessage, request } from '../api'

interface Result<T> {
  path: string
  revision: number
  data?: T
  error?: string
}

// Match results to their request so slow responses cannot replace a newer search.
export function useResource<T>(path: string) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<Result<T> | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    request<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ path, revision, data })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({ path, revision, error: errorMessage(error) })
      })
    return () => controller.abort()
  }, [path, revision])

  const current =
    result?.path === path && result.revision === revision ? result : null
  function updateData(update: (previous: T) => T) {
    setResult((previous) => {
      if (
        previous?.path !== path ||
        previous.revision !== revision ||
        previous.data === undefined
      )
        return previous
      return { ...previous, data: update(previous.data) }
    })
  }
  return {
    data: current?.data,
    error: current?.error,
    loading: current === null,
    retry: () => setRevision((value) => value + 1),
    updateData,
  }
}
