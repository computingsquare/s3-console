# Contributing to S3 Console

Thanks for your interest. A few rules before opening an issue or a PR.

## Setup

Backend:

```bash
cd server
npm install
S3_ENDPOINT=http://localhost:9000 \
S3_ACCESS_KEY_ID=minioadmin \
S3_SECRET_ACCESS_KEY=minioadmin \
DEV_AUTH_HEADER_BYPASS=true \
npm run dev
```

Frontend (separate terminal, repo root):

```bash
npm install
npm run dev
```

Local MinIO: `docker compose up -d minio`. Full details in the
[README](./README.md#local-development).

## Before opening a PR

```bash
npm run lint                  # frontend only, server is out of scope (no dedicated eslint config)
npm run test                  # frontend
(cd server && npm run test)   # backend
npm run build                 # tsc -b + vite build, must pass with no errors
```

No PR with broken lint/test/build. No `--no-verify` on git hooks if any are
configured.

## Style

- Strict TypeScript, no `any` unless documented.
- No abstraction for a single use case. Direct code over speculative generic
  layers.
- React components: one file = one component default export (see the
  `authContext.ts` / `AuthProvider.tsx` / `useAuth.ts` pattern for contexts,
  required by `react-refresh/only-export-components`).
- i18n: every visible string goes through `t('...')`, added to both
  `src/i18n/en.json` **and** `fr.json`.

## Security

This app uses an HTTP trust-headers auth pattern — see the "Security" section
of the [README](./README.md). To report a vulnerability, don't open a public
issue — contact contact@computingsquare.com directly.

## Commits / PRs

- Atomic commits, imperative present tense (`Add`, `Fix`, `Refactor`, not
  `Added`/`Fixed`).
- One PR = one topic. Don't mix an unrelated refactor with a feature.
- Describe the *why* in the PR description, not just the *what* (the diff
  already shows the what).
