# Contexto de build: a raiz deste repositório.
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . ./
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# O front chama /api; em dev quem reescreve é o proxy do vite, aqui é o nginx.
# A barra final do proxy_pass é o que remove o prefixo /api.
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location /api/ {' \
  '    proxy_pass http://backend:3000/;' \
  '    proxy_set_header Host $host;' \
  '    proxy_set_header X-Real-IP $remote_addr;' \
  '  }' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
