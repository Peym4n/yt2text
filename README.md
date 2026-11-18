# yt2text

Use Node.js 26 LTS to run `npm ci` and `npm start` locally. Set `REDIS_URL` in your shell or `.env` to use Redis for sessions. Local development uses in-memory sessions when `REDIS_URL` is unset.

Production requires `REDIS_URL`. On Fly.io, configure it as an app secret. GitHub Actions uses the repository secret `FLY_API_TOKEN` to deploy pushes to `master`.
