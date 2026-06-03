# Notebook

Static diary notebook built with plain HTML, CSS, and JavaScript. Diary data is stored as JSON under `public/data/` and can be served directly by GitHub Pages.

## Run Locally

```bash
python3 -m http.server 5174
```

Then open `http://127.0.0.1:5174/`.

## Data

- Published index: `public/data/index.json`
- Diary files: `public/data/diaries/**/*.json`
- The browser loads `public/data/index.json` directly.
- Saving uses the GitHub API to commit both the diary JSON and the index JSON back into `public/data/`.
- The refresh button asks GitHub Pages to rebuild the `main` branch deployment, with a `main` empty commit fallback.

No Vue, Vite, TypeScript, or npm build step is required.
