FROM node:24-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY public ./public
COPY index.html vite.config.ts tsconfig*.json ./
RUN npm run build

FROM node:24-alpine AS backend-build
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/src ./src
COPY server/tsconfig.json ./
RUN npm run build

FROM node:24-alpine AS backend-prod-deps
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ---- final image: frontend (nginx, serves the SPA, proxies /api to the backend sidecar) ----
# nginxinc/nginx-unprivileged: runs as uid 101, listens on 8080 (no privileged port), rootless.
FROM nginxinc/nginx-unprivileged:alpine AS frontend
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=localhost:4000
EXPOSE 8080

# ---- final image: backend (Node/Express, holds the S3 credentials) ----
FROM node:24-alpine AS backend
WORKDIR /app
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-prod-deps /app/node_modules ./node_modules
COPY server/package.json ./
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]

# ---- final image: single container with frontend (nginx) + backend (node) ----
# Same uid (101, nginx-unprivileged's default) for both processes since they
# share one container security context. Backend listens on localhost:4000 only.
FROM nginxinc/nginx-unprivileged:alpine AS app
COPY --from=frontend-build --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=backend-build --chown=nginx:nginx /app/dist /app/backend/dist
COPY --from=backend-prod-deps --chown=nginx:nginx /app/node_modules /app/backend/node_modules
COPY --from=node:24-alpine /usr/local/bin/node /usr/local/bin/node
COPY --chmod=755 docker-entrypoint-app.sh /docker-entrypoint-app.sh
ENV BACKEND_HOST=localhost:4000
EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint-app.sh"]
CMD ["nginx", "-g", "daemon off;"]
