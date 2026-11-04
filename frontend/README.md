# Notebook frontend

React + TypeScript + Vite frontend for Assignment 6. This project uses the existing `frontend/` folder as the client application.

## Run locally

Start PostgreSQL, run migrations, and start the provided API using the instructions in the repository README. The API must be available at `http://localhost:8080`.

In a separate terminal:

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

To use another API address, create `.env.local` with `VITE_API_URL=http://localhost:8080` and restart Vite. The provided Express server already allows cross-origin frontend requests.

## Features

- `/articles`: article list with previews and API-backed title search. Search is stored in the URL; outdated requests are cancelled.
- `/articles/new`: create an article with required title and contents.
- `/articles/:articleId`: full article, deletion, and inline comment creation, editing, and deletion.
- `/articles/:articleId/edit`: pre-populated article edit form.
- Loading, empty, error, retry, and submission states, accessible labels, keyboard focus styles, and responsive layouts.

## Checks

```sh
npm run build
npm run lint
npm test
```

Tests use a mocked API so they do not modify database records.

TypeScript is pinned to 6.0.3 to stay within the supported range of the installed typescript-eslint package.
