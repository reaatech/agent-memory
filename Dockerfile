FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/

RUN pnpm run build && pnpm prune --prod

FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

USER node

CMD ["node", "--version"]
