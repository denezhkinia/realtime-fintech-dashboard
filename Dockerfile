# Multi-stage: pnpm + asc + nx build → nginx static host
FROM node:22-bookworm AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
RUN pnpm install --frozen-lockfile
RUN pnpm nx build dashboard --configuration=production

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/dashboard/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
