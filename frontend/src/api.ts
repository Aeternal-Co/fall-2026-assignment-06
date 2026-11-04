export interface Article {
  articleId: number
  title: string
  contents: string
}

export interface Comment {
  commentId: number
  articleId: number
  body: string
}

export type ArticleInput = Pick<Article, 'title' | 'contents'>

const baseUrl = (
  import.meta.env.VITE_API_URL || 'http://localhost:8080'
).replace(/\/$/, '')

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error(
      'Unable to connect. Please check your connection and try again.',
      { cause: error },
    )
  }

  if (!response.ok) {
    const details = await response.json().catch(() => null)
    const fallback =
      response.status === 404
        ? 'This item could not be found. It may have been deleted.'
        : 'Your request could not be completed. Please try again.'
    throw new Error(
      typeof details?.error === 'string' ? details.error : fallback,
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function saveArticle(input: ArticleInput, articleId?: number) {
  return request<Article>(
    articleId === undefined ? '/articles' : `/articles/${articleId}`,
    {
      method: articleId === undefined ? 'POST' : 'PUT',
      body: JSON.stringify(input),
    },
  )
}
