FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY services/notification/package.json services/notification/package.json
RUN pnpm install --frozen-lockfile

COPY services/notification ./services/notification
RUN pnpm --filter @prevntiv/notification build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/services/notification/package.json ./services/notification/package.json
RUN pnpm install --prod --frozen-lockfile --filter @prevntiv/notification...
COPY --from=builder /app/services/notification/dist ./services/notification/dist

WORKDIR /app/services/notification
EXPOSE 3002
CMD ["node", "dist/index.js"]
