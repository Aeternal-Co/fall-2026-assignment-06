import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import type { Article, Comment } from '../src/api'

const longContents =
  'A longer article about learning React and sharing ideas. '.repeat(8)
let articles: Article[]
let comments: Comment[]
let calls: {
  method: string
  path: string
  query: string
  body: Record<string, string>
}[]
let failures: Map<string, number>
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

// A small in-memory API fixture keeps these user-flow tests independent of PostgreSQL.
beforeEach(() => {
  articles = [
    { articleId: 1, title: 'Learning React', contents: longContents },
    {
      articleId: 2,
      title: 'A second idea',
      contents: 'Some thoughts to share.',
    },
  ]
  comments = []
  calls = []
  failures = new Map()
  fetchMock = vi.fn<typeof fetch>(async (input, options = {}) => {
    const url = new URL(String(input))
    const method = options.method ?? 'GET'
    const body = options.body ? JSON.parse(String(options.body)) : {}
    calls.push({ method, path: url.pathname, query: url.search, body })
    const failure = failures.get(`${method} ${url.pathname}`)
    if (failure)
      return Response.json(
        { error: 'Please try again later.' },
        { status: failure },
      )

    if (url.pathname === '/articles') {
      if (method === 'POST') {
        const article = {
          articleId: 3,
          title: body.title,
          contents: body.contents,
        }
        articles.push(article)
        return Response.json(article, { status: 201 })
      }
      const query = url.searchParams.get('title_contains')?.toLowerCase()
      // This server-only result verifies the UI actually uses the search response.
      if (query === 'server')
        return Response.json([
          {
            articleId: 9,
            title: 'Server search result',
            contents: 'Only returned by a search.',
          },
        ])
      return Response.json(
        query
          ? articles.filter((article) =>
              article.title.toLowerCase().includes(query),
            )
          : articles,
      )
    }

    const [, , articleId, commentSegment, commentId] = url.pathname.split('/')
    const article = articles.find(
      (item) => item.articleId === Number(articleId),
    )
    if (!article)
      return Response.json({ error: 'article not found' }, { status: 404 })
    if (commentSegment === 'comments') {
      if (!commentId) {
        if (method === 'POST') {
          const comment = {
            commentId: 10,
            articleId: article.articleId,
            body: body.body,
          }
          comments.push(comment)
          return Response.json(comment, { status: 201 })
        }
        return Response.json(
          comments.filter((comment) => comment.articleId === article.articleId),
        )
      }
      const comment = comments.find(
        (item) =>
          item.commentId === Number(commentId) &&
          item.articleId === article.articleId,
      )
      if (!comment)
        return Response.json({ error: 'comment not found' }, { status: 404 })
      if (method === 'PUT') comment.body = body.body
      if (method === 'DELETE')
        comments = comments.filter((item) => item !== comment)
      return Response.json(comment)
    }
    if (method === 'PUT') Object.assign(article, body)
    if (method === 'DELETE') {
      articles = articles.filter((item) => item !== article)
      comments = comments.filter((item) => item.articleId !== article.articleId)
    }
    return Response.json(article)
  })
  vi.stubGlobal('fetch', fetchMock)
})

function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  )
}

function openPage(path = '/articles') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('articles', () => {
  it('fetches the collection, truncates previews, and links to full articles', async () => {
    const user = openPage()
    expect(screen.getByText('Loading articles…')).toBeTruthy()
    await screen.findByRole('heading', { name: 'Learning React' })
    expect(screen.queryByText(longContents.trim())).toBeNull()
    expect(screen.getAllByRole('article')[0].textContent).toContain('…')
    await user.click(
      screen.getByRole('link', { name: 'Read article: Learning React' }),
    )
    await screen.findByRole('heading', { name: 'Learning React', level: 1 })
    expect(screen.getByText(longContents.trim())).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe('/articles/1')
    expect(calls.some((call) => call.path === '/articles/1')).toBe(true)
  })

  it('uses API search results and clears the filter without a page reload', async () => {
    const user = openPage()
    await screen.findByRole('heading', { name: 'Learning React' })
    await user.type(screen.getByRole('searchbox'), 'server')
    await screen.findByRole('heading', { name: 'Server search result' })
    expect(screen.queryByRole('heading', { name: 'Learning React' })).toBeNull()
    expect(calls.some((call) => call.query === '?title_contains=server')).toBe(
      true,
    )
    await user.clear(screen.getByRole('searchbox'))
    await screen.findByRole('heading', { name: 'Learning React' })
    await user.type(screen.getByRole('searchbox'), 'missing')
    await screen.findByText('No matching articles.')
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    await screen.findByRole('heading', { name: 'Learning React' })
  })

  it('ignores an old search response that arrives after a newer response', async () => {
    let resolveOld!: (response: Response) => void
    let oldSignal: AbortSignal | null | undefined
    const original = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((input, options) => {
      if (String(input).endsWith('title_contains=old')) {
        oldSignal = options?.signal
        return new Promise((resolve) => {
          resolveOld = resolve
        })
      }
      return original(input, options)
    })
    openPage()
    await screen.findByRole('heading', { name: 'Learning React' })
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'old' },
    })
    await waitFor(() => expect(resolveOld).toBeTypeOf('function'))
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'server' },
    })
    await screen.findByRole('heading', { name: 'Server search result' })
    await act(async () =>
      resolveOld(
        Response.json([
          { articleId: 8, title: 'Stale result', contents: 'Old response' },
        ]),
      ),
    )
    expect(oldSignal?.aborted).toBe(true)
    expect(screen.queryByText('Stale result')).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Server search result' }),
    ).toBeTruthy()
  })

  it('validates whitespace-only fields, creates an article, and opens its detail view', async () => {
    const user = openPage('/articles/new')
    await user.type(screen.getByLabelText('Title'), '   ')
    await user.click(screen.getByRole('button', { name: 'Create article' }))
    expect(screen.getByText('Please enter a title.')).toBeTruthy()
    expect(screen.getByText('Please enter the article contents.')).toBeTruthy()
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0)
    await user.type(screen.getByLabelText('Title'), 'New idea')
    await user.type(screen.getByLabelText('Contents'), 'The complete article.')
    await user.click(screen.getByRole('button', { name: 'Create article' }))
    await screen.findByRole('heading', { name: 'New idea', level: 1 })
    expect(screen.getByTestId('location').textContent).toBe('/articles/3')
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
      title: 'New idea',
      contents: 'The complete article.',
    })
  })

  it('pre-populates edits, validates them, and redirects after saving', async () => {
    const user = openPage('/articles/2/edit')
    const title = await screen.findByLabelText('Title')
    expect((title as HTMLInputElement).value).toBe('A second idea')
    expect(
      (screen.getByLabelText('Contents') as HTMLTextAreaElement).value,
    ).toBe('Some thoughts to share.')
    await user.clear(title)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Please enter a title.')).toBeTruthy()
    await user.type(title, 'A refined idea')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByRole('heading', { name: 'A refined idea', level: 1 })
    expect(screen.getByTestId('location').textContent).toBe('/articles/2')
    expect(calls.find((call) => call.method === 'PUT')?.body.title).toBe(
      'A refined idea',
    )
  })

  it('cancels a deletion or deletes the article and returns to the collection', async () => {
    const user = openPage('/articles/2')
    await screen.findByRole('heading', { name: 'A second idea', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Delete article' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Delete article' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, delete article' }),
    )
    await screen.findByRole('heading', { name: 'All articles' })
    await screen.findByRole('heading', { name: 'Learning React' })
    expect(screen.getByTestId('location').textContent).toBe('/articles')
    expect(screen.queryByRole('heading', { name: 'A second idea' })).toBeNull()
  })

  it('keeps a draft after a failed save and lets the user retry', async () => {
    failures.set('POST /articles', 500)
    const user = openPage('/articles/new')
    await user.type(screen.getByLabelText('Title'), 'Keep my draft')
    await user.type(
      screen.getByLabelText('Contents'),
      'Do not lose these words.',
    )
    await user.click(screen.getByRole('button', { name: 'Create article' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe(
      'Keep my draft',
    )
    expect(screen.getByTestId('location').textContent).toBe('/articles/new')
    failures.clear()
    await user.click(screen.getByRole('button', { name: 'Create article' }))
    await screen.findByRole('heading', { name: 'Keep my draft', level: 1 })
  })

  it('shows failed requests, supports retry, and displays the empty collection', async () => {
    failures.set('GET /articles', 500)
    const user = openPage()
    await screen.findByRole('alert')
    failures.clear()
    articles = []
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText('No articles yet.')
    expect(
      screen.getByRole('link', { name: 'Create article', exact: true }),
    ).toBeTruthy()
  })

  it('shows a missing article without rendering comment controls', async () => {
    openPage('/articles/999')
    expect((await screen.findByRole('alert')).textContent).toContain(
      'article not found',
    )
    expect(screen.queryByLabelText('Add a comment')).toBeNull()
  })
})

describe('comments', () => {
  it('adds, cancels edits, validates, updates, and deletes inline', async () => {
    const user = openPage('/articles/1')
    await screen.findByText('No comments yet.')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(screen.getByText('Please enter a comment.')).toBeTruthy()
    expect(calls.some((call) => call.method === 'POST')).toBe(false)
    await user.type(
      screen.getByLabelText('Add a comment'),
      'An interesting perspective.',
    )
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    await screen.findByText('An interesting perspective.')
    expect(
      (screen.getByLabelText('Add a comment') as HTMLTextAreaElement).value,
    ).toBe('')
    const comment = screen.getByRole('listitem', { name: 'Comment 10' })
    await user.click(within(comment).getByRole('button', { name: 'Edit' }))
    expect(
      (screen.getByLabelText('Edit comment') as HTMLTextAreaElement).value,
    ).toBe('An interesting perspective.')
    await user.clear(screen.getByLabelText('Edit comment'))
    await user.type(screen.getByLabelText('Edit comment'), 'An abandoned edit.')
    await user.click(within(comment).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('An interesting perspective.')).toBeTruthy()
    expect(calls.some((call) => call.method === 'PUT')).toBe(false)
    await user.click(within(comment).getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Edit comment'))
    await user.click(screen.getByRole('button', { name: 'Save comment' }))
    expect(screen.getByText('Please enter a comment.')).toBeTruthy()
    await user.type(
      screen.getByLabelText('Edit comment'),
      'A refined perspective.',
    )
    await user.click(screen.getByRole('button', { name: 'Save comment' }))
    await screen.findByText('A refined perspective.')
    await user.click(within(comment).getByRole('button', { name: 'Delete' }))
    await screen.findByText('No comments yet.')
    expect(screen.queryByText('A refined perspective.')).toBeNull()
    expect(screen.getByTestId('location').textContent).toBe('/articles/1')
    expect(
      calls
        .filter((call) => call.method !== 'GET')
        .map((call) => [call.method, call.path]),
    ).toEqual([
      ['POST', '/articles/1/comments'],
      ['PUT', '/articles/1/comments/10'],
      ['DELETE', '/articles/1/comments/10'],
    ])
  })

  it('preserves comments and drafts when mutations fail', async () => {
    comments = [{ commentId: 10, articleId: 1, body: 'Existing comment.' }]
    failures.set('DELETE /articles/1/comments/10', 500)
    const user = openPage('/articles/1')
    await screen.findByText('Existing comment.')
    const comment = screen.getByRole('listitem', { name: 'Comment 10' })
    await user.click(within(comment).getByRole('button', { name: 'Delete' }))
    await screen.findByRole('alert')
    expect(screen.getByText('Existing comment.')).toBeTruthy()
    failures.clear()
    failures.set('PUT /articles/1/comments/10', 500)
    await user.click(within(comment).getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Edit comment'))
    await user.type(screen.getByLabelText('Edit comment'), 'Keep this edit.')
    await user.click(screen.getByRole('button', { name: 'Save comment' }))
    await screen.findByRole('alert')
    expect(
      (screen.getByLabelText('Edit comment') as HTMLTextAreaElement).value,
    ).toBe('Keep this edit.')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    failures.set('POST /articles/1/comments', 500)
    await user.type(screen.getByLabelText('Add a comment'), 'Keep this draft.')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    await screen.findByRole('alert')
    expect(
      (screen.getByLabelText('Add a comment') as HTMLTextAreaElement).value,
    ).toBe('Keep this draft.')
    expect(screen.getByText('Existing comment.')).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe('/articles/1')
  })

  it('keeps the article visible if loading comments fails and supports retry', async () => {
    failures.set('GET /articles/1/comments', 500)
    const user = openPage('/articles/1')
    await screen.findByRole('alert')
    expect(
      screen.getByRole('heading', { name: 'Learning React', level: 1 }),
    ).toBeTruthy()
    expect(
      (
        screen.getByRole('button', {
          name: 'Post comment',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    failures.clear()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText('No comments yet.')
    expect(
      (
        screen.getByRole('button', {
          name: 'Post comment',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false)
  })
})
