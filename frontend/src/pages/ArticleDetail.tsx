import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { errorMessage, request } from '../api'
import type { Article } from '../api'
import { useResource } from '../hooks/useResource'
import { ErrorNotice, Loading } from '../components/Feedback'
import Comments from '../components/Comments'

export default function ArticleDetail() {
  const { articleId } = useParams()
  return <ArticleDetailContent key={articleId} articleId={articleId!} />
}

function ArticleDetailContent({ articleId }: { articleId: string }) {
  const {
    data: article,
    loading,
    error,
    retry,
  } = useResource<Article>(`/articles/${encodeURIComponent(articleId)}`)
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function deleteArticle() {
    if (!article || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await request(`/articles/${article.articleId}`, { method: 'DELETE' })
      navigate('/articles', { replace: true })
    } catch (error) {
      setDeleteError(errorMessage(error))
      setDeleting(false)
    }
  }

  return (
    <div className="reading-column">
      <Link className="back-link" to="/articles">
        ← All articles
      </Link>
      {loading && <Loading>Loading article…</Loading>}
      {error && <ErrorNotice message={error} retry={retry} />}
      {article && (
        <>
          <article>
            <header className="detail-heading">
              <p className="eyebrow">Article {article.articleId}</p>
              <h1>{article.title}</h1>
              <div className="article-actions">
                <Link
                  className="button button-small"
                  to={`/articles/${article.articleId}/edit`}
                >
                  Edit article
                </Link>
                <button
                  className="button button-small button-danger-quiet"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete article
                </button>
              </div>
            </header>
            {confirmDelete && (
              <div className="notice delete-confirmation">
                <p>
                  Delete this article and all its comments? This cannot be
                  undone.
                </p>
                <div className="button-row">
                  <button
                    className="button button-danger button-small"
                    disabled={deleting}
                    onClick={deleteArticle}
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete article'}
                  </button>
                  <button
                    className="button button-small"
                    disabled={deleting}
                    onClick={() => {
                      setConfirmDelete(false)
                      setDeleteError('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {deleteError && <ErrorNotice message={deleteError} />}
            <div className="article-contents">{article.contents}</div>
          </article>
          <Comments key={article.articleId} articleId={article.articleId} />
        </>
      )}
    </div>
  )
}
