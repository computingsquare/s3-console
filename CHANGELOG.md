# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha] - 2026-06-27

### Added
- Bucket management: create, delete, list (paginated/filterable)
- Object operations: upload, download, delete, metadata, tags
- Multi-select: bulk delete, copy to another bucket
- Bucket settings: public/private toggle, policy/CORS/lifecycle configuration
- RBAC via identity headers: `admin` (full access) and `viewer` (read-only)
- UI: light/dark theme, English/French localization
- Kubernetes deployment: Helm chart with security hardening (rootless, seccomp, read-only filesystem)
- End-to-end tests: Playwright suite covering core flows
- Docker images: separate `frontend` + `backend` sidecars and combined `app` image
- Backend: Node/Express, speaks standard S3 API (MinIO, AWS S3, Ceph, RustFS, etc.)
- Frontend: React 19 + Vite, Mantine UI, React Router

### Known Limitations
- Tag filter: best-effort only (covers current page/folder)
- No bucket versioning or event notifications support
- CORS rules may fail on MinIO versions with `PutBucketCors` limitations
- No MinIO admin API integration (quotas, global policies)
- Object listing uses S3 API pagination (no custom bucket-wide scans)

### Security
- ⚠️ Requires oauth2-proxy or equivalent reverse proxy in front for authentication
- Header-based RBAC: `X-Forwarded-Email` / `X-Forwarded-Groups`
- Backend holds S3 credentials — frontend never accesses them
- Rootless images, `securityContext` hardening, no privilege escalation

### Pre-production status
- ✅ Core S3 operations stable
- 🔄 Security audit recommended before production use
- 🔄 API documentation to be completed
- 📋 Optional: MinIO admin API integration for future versions

See [README.md](./README.md) for full documentation and deployment guides.
