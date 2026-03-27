FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui-components/package.json packages/ui-components/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @prevntiv/web build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
RUN pnpm install --prod --frozen-lockfile --filter @prevntiv/web...

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.js ./apps/web/next.config.js

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
