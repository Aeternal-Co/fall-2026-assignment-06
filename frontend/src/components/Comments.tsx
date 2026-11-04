import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage, request } from '../api'
import type { Comment } from '../api'
import { useResource } from '../hooks/useResource'
import { ErrorNotice, Loading } from './Feedback'

export default function Comments({ articleId }: { articleId: number }) {
  const path = `/articles/${articleId}/comments`
  const {
    data: comments,
    error,
    loading,
    retry,
    updateData,
  } = useResource<Comment[]>(path)
  const [body, setBody] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const invalid = submitted && !body.trim()

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !comments) return
    setSubmitted(true)
    setSaveError('')
    if (!body.trim()) return
    setSaving(true)
    try {
      const comment = await request<Comment>(path, {
        method: 'POST',
        body: JSON.stringify({ body: body.trim() }),
      })
      updateData((current) => [...current, comment])
      setBody('')
      setSubmitted(false)
      setAnnouncement('Comment added.')
    } catch (error) {
      setSaveError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="comments-section" aria-labelledby="comments-heading">
      <div className="section-heading">
        <h2 id="comments-heading">Comments</h2>
        {comments && (
          <span
            className="count-badge"
            aria-label={`${comments.length} comments`}
          >
            {comments.length}
          </span>
        )}
      </div>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {loading && <Loading>Loading comments…</Loading>}
      {error && <ErrorNotice message={error} retry={retry} />}
      {comments?.length === 0 && (
        <div className="comments-empty">
          <p>No comments yet.</p>
        </div>
      )}
      {!!comments?.length && (
        <ul className="comment-list">
          {comments.map((comment) => (
            <CommentItem
              key={comment.commentId}
              comment={comment}
              onUpdate={(updated) => {
                updateData((current) =>
                  current.map((item) =>
                    item.commentId === updated.commentId ? updated : item,
                  ),
                )
                setAnnouncement('Comment updated.')
              }}
              onDelete={() => {
                updateData((current) =>
                  current.filter(
                    (item) => item.commentId !== comment.commentId,
                  ),
                )
                setAnnouncement('Comment deleted.')
              }}
            />
          ))}
        </ul>
      )}
      <form
        className="comment-form"
        onSubmit={addComment}
        noValidate
        aria-busy={saving}
      >
        <div className="form-field">
          <label htmlFor="new-comment">Add a comment</label>
          <textarea
            id="new-comment"
            rows={4}
            placeholder="Enter a comment"
            value={body}
            required
            disabled={saving || !comments}
            onChange={(event) => setBody(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={invalid ? 'comment-error' : undefined}
          />
          {invalid && (
            <p id="comment-error" className="field-error" role="alert">
              Please enter a comment.
            </p>
          )}
        </div>
        {saveError && <ErrorNotice message={saveError} />}
        <button
          className="button button-primary"
          disabled={saving || !comments}
          type="submit"
        >
          {saving ? 'Posting…' : 'Post comment'}
        </button>
      </form>
    </section>
  )
}

function CommentItem({
  comment,
  onUpdate,
  onDelete,
}: {
  comment: Comment
  onUpdate: (comment: Comment) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(comment.body)
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState<'save' | 'delete' | null>(null)
  const [error, setError] = useState('')
  const path = `/articles/${comment.articleId}/comments/${comment.commentId}`
  const invalid = submitted && !body.trim()

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setSubmitted(true)
    setError('')
    if (!body.trim()) return
    setPending('save')
    try {
      const updated = await request<Comment>(path, {
        method: 'PUT',
        body: JSON.stringify({ body: body.trim() }),
      })
      onUpdate(updated)
      setEditing(false)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setPending(null)
    }
  }

  async function remove() {
    if (pending) return
    setError('')
    setPending('delete')
    try {
      await request(path, { method: 'DELETE' })
      onDelete()
    } catch (error) {
      setError(errorMessage(error))
      setPending(null)
    }
  }

  return (
    <li
      className="comment-item"
      aria-label={`Comment ${comment.commentId}`}
      aria-busy={!!pending}
    >
      <div className="comment-header">
        <span className="eyebrow">
          Comment {String(comment.commentId).padStart(2, '0')}
        </span>
        {!editing && (
          <div className="button-row">
            <button
              className="text-button"
              disabled={!!pending}
              onClick={() => {
                setBody(comment.body)
                setSubmitted(false)
                setError('')
                setEditing(true)
              }}
            >
              Edit
            </button>
            <button
              className="text-button text-danger"
              disabled={!!pending}
              onClick={remove}
            >
              {pending === 'delete' ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <form onSubmit={save} noValidate>
          <div className="form-field">
            <label htmlFor={`edit-comment-${comment.commentId}`}>
              Edit comment
            </label>
            <textarea
              id={`edit-comment-${comment.commentId}`}
              rows={3}
              value={body}
              required
              disabled={!!pending}
              onChange={(event) => setBody(event.target.value)}
              aria-invalid={invalid}
              aria-describedby={
                invalid ? `edit-error-${comment.commentId}` : undefined
              }
            />
            {invalid && (
              <p
                id={`edit-error-${comment.commentId}`}
                className="field-error"
                role="alert"
              >
                Please enter a comment.
              </p>
            )}
          </div>
          <div className="button-row">
            <button
              className="button button-primary button-small"
              type="submit"
              disabled={!!pending}
            >
              {pending === 'save' ? 'Saving…' : 'Save comment'}
            </button>
            <button
              className="button button-small"
              type="button"
              disabled={!!pending}
              onClick={() => {
                setEditing(false)
                setError('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="comment-body">{comment.body}</p>
      )}
      {error && <ErrorNotice message={error} />}
    </li>
  )
}
