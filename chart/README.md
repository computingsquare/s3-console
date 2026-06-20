# s3-console Helm chart

Deploys S3 Console as a single Deployment with two sidecar containers
(frontend/nginx + backend/Node) behind one `Service`, plus an optional
`Ingress`.

> [!WARNING]
> This chart assumes a reverse proxy (oauth2-proxy or equivalent) sits in
> front of the `Service` and injects identity headers. Read the "Security"
> section of the [main README](../README.md) before deploying — the
> backend's port must never be reachable by any path that bypasses that
> proxy.

## Install

This chart deploys the `frontend` and `backend` Dockerfile targets as
sidecars — build and push both (see the main README's
[Build & deploy](../README.md#build--deploy) section), then:

```bash
helm install s3-console ./chart \
  --set image.repository=<your-registry>/s3-console-frontend \
  --set backendImage.repository=<your-registry>/s3-console-backend \
  --set s3.endpoint=https://s3.example.com \
  --set s3.existingSecret=s3-console-credentials \
  --set auth.adminGroup=s3-admin
```

The combined `app` image published to `ghcr.io/computingsquare/s3-console`
(single container, see main README) is **not** used by this chart — it targets
single-container platforms (PaaS) instead of the sidecar topology below.

`s3.existingSecret` must reference a Kubernetes `Secret` with `accessKeyId`
and `secretAccessKey` keys:

```bash
kubectl create secret generic s3-console-credentials \
  --from-literal=accessKeyId=AKIA... \
  --from-literal=secretAccessKey=...
```

The `s3.accessKeyId` / `s3.secretAccessKey` inline fallback (plaintext in
`values.yaml`/`--set`) is for local testing only — never use it in production.

## Values

| Key | Default | Description |
|---|---|---|
| `image.repository` | `s3-console` | Frontend image repository |
| `image.tag` | `latest` | Frontend image tag |
| `image.pullPolicy` | `IfNotPresent` | |
| `backendImage.repository` | `s3-console-backend` | Backend image repository |
| `backendImage.tag` | `latest` | Backend image tag |
| `backendImage.pullPolicy` | `IfNotPresent` | |
| `replicaCount` | `1` | Deployment replicas |
| `service.type` | `ClusterIP` | |
| `service.port` | `80` | Port exposed by the `Service` (routes to the frontend container's `8080`) |
| `ingress.enabled` | `false` | |
| `ingress.className` | `""` | |
| `ingress.host` | `""` | |
| `s3.endpoint` | `""` | S3/MinIO endpoint URL, used by the backend only |
| `s3.region` | `us-east-1` | |
| `s3.forcePathStyle` | `true` | Required for MinIO and most self-hosted S3 implementations |
| `s3.existingSecret` | `""` | Name of a `Secret` with `accessKeyId`/`secretAccessKey` keys (recommended) |
| `s3.accessKeyId` | `""` | Inline fallback — dev only |
| `s3.secretAccessKey` | `""` | Inline fallback — dev only |
| `auth.userHeader` | `X-Forwarded-Email` | Header read for the user's identity |
| `auth.groupsHeader` | `X-Forwarded-Groups` | Header read for the user's groups |
| `auth.adminGroup` | `s3-admin` | Group granting the `admin` role; everyone else is `viewer` |

## Security defaults

This chart ships secure-by-default pod settings, not opt-in flags:

- Pod-level `securityContext`: `runAsNonRoot: true`, `fsGroup: 101`,
  `seccompProfile: RuntimeDefault`.
- Per-container `securityContext`: `allowPrivilegeEscalation: false`,
  `readOnlyRootFilesystem: true`, `capabilities.drop: [ALL]` — frontend runs
  as uid 101 (nginx-unprivileged), backend as uid 1000 (`node`).
- All writable paths are explicit `emptyDir` volumes (nginx cache/run/conf.d,
  `/tmp` on both containers) — there is no other writable filesystem path in
  either container.
- The `Service` exposes only the frontend's port. The backend's port (4000)
  has no `Service` entry and is reachable only inside the pod's network
  namespace.

These containers will not run on a cluster that doesn't allow non-root pods
or `RuntimeDefault` seccomp — that's intentional.

## Uninstall

```bash
helm uninstall s3-console
```

No PersistentVolumeClaim is created by this chart (S3 is the storage), so
there's nothing left behind besides the Secret you created manually, if any.
