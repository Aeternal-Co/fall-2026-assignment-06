import { Link, useSearchParams } from 'react-router'
import type { Article } from '../api'
import { useResource } from '../hooks/useResource'
import { ErrorNotice, Loading } from '../components/Feedback'

export default function ArticleList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('title_contains') ?? ''
  const query = search.trim()
  const path = query
    ? `/articles?${new URLSearchParams({ title_contains: query })}`
    : '/articles'
  const { data: articles, loading, error, retry } = useResource<Article[]>(path)

  return (
    <>
      <section aria-label="Article collection">
        <div className="collection-toolbar">
          <div>
            <h1>All articles</h1>
            {articles && (
              <p className="muted" role="status">
                {`${articles.length} ${articles.length === 1 ? 'article' : 'articles'}${query ? ' found' : ''}`}
              </p>
            )}
          </div>
          <div className="search-field" role="search">
            <label htmlFor="article-search">Search by title</label>
            <div className="search-input-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 5 5" />
              </svg>
              <input
                id="article-search"
                type="search"
                placeholder="Enter a title"
                value={search}
                onChange={(event) =>
                  setSearchParams(
                    event.target.value
                      ? { title_contains: event.target.value }
                      : {},
                    { replace: true },
                  )
                }
              />
            </div>
          </div>
        </div>
        {loading && <Loading>Loading articles…</Loading>}
        {error && <ErrorNotice message={error} retry={retry} />}
        {articles?.length === 0 && (
          <div className="empty-state">
            <span className="empty-mark" aria-hidden="true">
              {query ? '?' : '+'}
            </span>
            <h2>{query ? 'No matching articles.' : 'No articles yet.'}</h2>
            {query && <p>No titles contain “{query}”. Try another search.</p>}
            {query ? (
              <button className="button" onClick={() => setSearchParams({})}>
                Clear search
              </button>
            ) : (
              <Link className="button button-primary" to="/articles/new">
                Create article
              </Link>
            )}
          </div>
        )}
        {!!articles?.length && (
          <div className="article-grid">
            {articles.map((article) => {
              const preview = article.contents.replace(/\s+/g, ' ').trim()
              const minutes = Math.max(
                1,
                Math.ceil(preview.split(/\s+/).length / 200),
              )
              return (
                <article className="article-card" key={article.articleId}>
                  <div className="card-meta">
                    <span>
                      Article {String(article.articleId).padStart(2, '0')}
                    </span>
                    <span>{minutes} min read</span>
                  </div>
                  <h2>
                    <Link to={`/articles/${article.articleId}`}>
                      {article.title}
                    </Link>
                  </h2>
                  <p className="article-preview">
                    {preview.length > 180
                      ? `${preview.slice(0, 180).trimEnd()}…`
                      : preview}
                  </p>
                  <Link
                    className="read-link"
                    to={`/articles/${article.articleId}`}
                    aria-label={`Read article: ${article.title}`}
                  >
                    Read article <span aria-hidden="true">↗</span>
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
