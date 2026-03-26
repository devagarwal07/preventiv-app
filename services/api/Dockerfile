FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.json ./
COPY services/api/package.json services/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/validators/package.json packages/validators/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @prevntiv/api build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/services/api/package.json ./services/api/package.json
RUN pnpm install --prod --frozen-lockfile --filter @prevntiv/api...

COPY --from=builder /app/services/api/dist ./services/api/dist

WORKDIR /app/services/api
EXPOSE 3001
CMD ["node", "dist/server.js"]
