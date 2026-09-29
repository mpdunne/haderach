# Haderach question sets

Bundled question banks live in `question-sets/` as JSON files. The app loads the files listed in `EXTERNAL_SET_FILES` in `app.js`.

The bundled naturalisation bank is `question-sets/naturalisation-francaise-2026.json`. It is not copied into localStorage.

Question sets imported through the UI (CSV/XLSX) are converted to the same internal structure and stored locally in the browser. Learning progress (wrong answers, stars, Sure status, attempts) is also stored locally, keyed by set ID + question ID.

## Stable progress identity
Question `id` values are permanent identities. Haderach also stores a SHA-256 content fingerprint of each question's prompt, options and correct answer in local progress. On an app/bank update, unchanged IDs retain all progress. If the content fingerprint changes, attempts, mistakes and flags are retained, but `Sure` is cleared so edited knowledge is reviewed again. Explanation, hint and source edits do not change the fingerprint.
