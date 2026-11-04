import { Link, NavLink, Navigate, Route, Routes } from 'react-router'
import ArticleList from './pages/ArticleList'
import ArticleDetail from './pages/ArticleDetail'
import ArticleEditor from './pages/ArticleEditor'
import './App.css'

export default function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" to="/articles" aria-label="Notebook home">
          <span className="brand-mark" aria-hidden="true">
            N.
          </span>
          Notebook
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/articles" end>
            Articles
          </NavLink>
          <NavLink className="button button-primary" to="/articles/new">
            + Create article
          </NavLink>
        </nav>
      </header>
      <main id="main-content" className="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Navigate to="/articles" replace />} />
          <Route path="/articles" element={<ArticleList />} />
          <Route path="/articles/new" element={<ArticleEditor />} />
          <Route path="/articles/:articleId" element={<ArticleDetail />} />
          <Route
            path="/articles/:articleId/edit"
            element={<ArticleEditor editing />}
          />
          <Route
            path="*"
            element={
              <section className="empty-state">
                <p className="eyebrow">404</p>
                <h1>Page not found</h1>
                <Link className="button button-primary" to="/articles">
                  Back to articles
                </Link>
              </section>
            }
          />
        </Routes>
      </main>
    </div>
  )
}
