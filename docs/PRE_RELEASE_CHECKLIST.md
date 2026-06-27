# Pre-Release Checklist (v0.1.0)

Guide for preparing a stable release candidate (RC) or production release from the alpha version.

## Code Quality

- [ ] All tests passing locally: `npm run test && npm run test:e2e && (cd server && npm run test)`
- [ ] Linting clean: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors or warnings
- [ ] Code review: all changes reviewed by at least one maintainer

## Documentation

- [ ] README.md updated (features, installation, security, known limitations)
- [ ] CONTRIBUTING.md complete and current
- [ ] CHANGELOG.md updated with all changes since last release
- [ ] API documentation (if applicable) — consider Swagger/OpenAPI for backend
- [ ] Deployment guide (Kubernetes/Docker) complete
- [ ] Security section in docs is comprehensive and current

## Testing

- [ ] Unit tests cover all auth logic (`server/src/auth.test.ts`)
- [ ] Component tests for critical UI flows
- [ ] E2E tests cover: bucket creation, object upload/download, multi-select, settings
- [ ] E2E tests pass in CI pipeline (`npm run test:e2e`)
- [ ] Manual smoke test: against real MinIO/S3 endpoint
- [ ] Performance baseline: object listing with 1000+ objects, large uploads

## Security

- [ ] Security audit complete (optional for alpha, recommended for stable)
- [ ] No hardcoded secrets or credentials in code
- [ ] Dependencies updated: `npm outdated` and address high-severity vulns
- [ ] Docker images: rootless, read-only filesystem, no unnecessary permissions
- [ ] Helm chart: security defaults enabled (securityContext, RBAC, network policies)
- [ ] OWASP check: no XSS, CSRF, SQL injection, path traversal vectors

## Deployment & Artifacts

- [ ] Docker images built and pushed to `ghcr.io/computingsquare/*`
  - [ ] `s3-console:v0.1.0` (combined app image)
  - [ ] `s3-console-frontend:v0.1.0`
  - [ ] `s3-console-backend:v0.1.0`
- [ ] Helm chart packaged: `helm package chart`
- [ ] Chart published to GitHub Releases (or OCI registry)
- [ ] Chart can be installed: `helm install s3-console ./chart`

## Release Notes

- [ ] GitHub Release created with:
  - [ ] Helm chart (.tgz) attached
  - [ ] Docker image tags documented
  - [ ] Upgrade path documented (if upgrading from prior release)
  - [ ] Security notes and known limitations highlighted
  - [ ] Installation instructions (Kubernetes + Docker)

## Pre-Release Version Bumps

For moving from `0.1.0-alpha` to `0.1.0-rc1` or `0.1.0`:

```bash
# 1. Update version in package.json
npm version minor   # or patch/major as needed

# 2. Update Chart.yaml and appVersion
vim chart/Chart.yaml

# 3. Update CHANGELOG.md with release date

# 4. Commit, tag, push
git add -A
git commit -m "chore: release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

CI will automatically build and publish Docker images + Helm chart on tag push.

## Post-Release

- [ ] Verify Docker images available on ghcr.io
- [ ] Verify Helm chart downloadable from GitHub Releases
- [ ] Monitor first deployments for issues (Slack, GitHub issues)
- [ ] Plan next release cycle (v0.2.0 features, timeline)

## Notes

- **Alpha → Release Candidate**: main focus on security audit + test coverage
- **Release Candidate → Stable**: focus on real-world deployment feedback
- **Breaking changes** in v0.x are acceptable (note in CHANGELOG)
- **Semantic versioning** starts at v1.0.0; v0.x is pre-release

---

See [README.md](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md) for more context.
