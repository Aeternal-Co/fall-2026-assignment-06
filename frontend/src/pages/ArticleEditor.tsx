import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { errorMessage, saveArticle } from '../api'
import type { Article } from '../api'
import { useResource } from '../hooks/useResource'
import { ErrorNotice, Loading } from '../components/Feedback'

export default function ArticleEditor({
  editing = false,
}: {
  editing?: boolean
}) {
  const { articleId } = useParams()
  return (
    <div className="reading-column">
      <Link
        className="back-link"
        to={editing ? `/articles/${articleId}` : '/articles'}
      >
        ← {editing ? 'Back to article' : 'All articles'}
      </Link>
      <header className="page-heading editor-heading">
        <h1>{editing ? 'Edit article' : 'Create article'}</h1>
      </header>
      {editing ? (
        <LoadArticleForm key={articleId} articleId={articleId!} />
      ) : (
        <ArticleForm key="new" />
      )}
    </div>
  )
}

function LoadArticleForm({ articleId }: { articleId: string }) {
  const { data, loading, error, retry } = useResource<Article>(
    `/articles/${encodeURIComponent(articleId)}`,
  )
  if (loading) return <Loading>Loading article…</Loading>
  if (error) return <ErrorNotice message={error} retry={retry} />
  return data && <ArticleForm key={data.articleId} article={data} />
}

function ArticleForm({ article }: { article?: Article }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(article?.title ?? '')
  const [contents, setContents] = useState(article?.contents ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const titleInvalid = submitted && !title.trim()
  const contentsInvalid = submitted && !contents.trim()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSubmitted(true)
    setError('')
    if (!title.trim() || !contents.trim()) return
    setSaving(true)
    try {
      const saved = await saveArticle(
        { title: title.trim(), contents: contents.trim() },
        article?.articleId,
      )
      navigate(`/articles/${saved.articleId}`, { replace: true })
    } catch (error) {
      setError(errorMessage(error))
      setSaving(false)
    }
  }

  return (
    <form
      className="editor-form"
      noValidate
      onSubmit={submit}
      aria-busy={saving}
    >
      <p className="form-note">Both fields are required.</p>
      <div className="form-field">
        <label htmlFor="article-title">Title</label>
        <input
          id="article-title"
          placeholder="Enter the article title"
          value={title}
          disabled={saving}
          required
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={titleInvalid}
          aria-describedby={titleInvalid ? 'title-error' : undefined}
        />
        {titleInvalid && (
          <p id="title-error" className="field-error" role="alert">
            Please enter a title.
          </p>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="article-contents">Contents</label>
        <textarea
          id="article-contents"
          rows={12}
          placeholder="Enter the article contents"
          value={contents}
          disabled={saving}
          required
          onChange={(event) => setContents(event.target.value)}
          aria-invalid={contentsInvalid}
          aria-describedby={contentsInvalid ? 'contents-error' : undefined}
        />
        {contentsInvalid && (
          <p id="contents-error" className="field-error" role="alert">
            Please enter the article contents.
          </p>
        )}
      </div>
      {error && <ErrorNotice message={error} />}
      <div className="form-footer">
        <span className="muted">
          {contents.trim() ? contents.trim().split(/\s+/).length : 0} words
        </span>
        <div className="button-row">
          <Link
            className="button"
            to={article ? `/articles/${article.articleId}` : '/articles'}
          >
            Cancel
          </Link>
          <button
            className="button button-primary"
            disabled={saving}
            type="submit"
          >
            {saving ? 'Saving…' : article ? 'Save changes' : 'Create article'}
          </button>
        </div>
      </div>
    </form>
  )
}
