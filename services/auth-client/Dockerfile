# syntax=docker/dockerfile:1

FROM node:24.20.0-bookworm-slim AS dependencies
WORKDIR /app
ENV CI=true

RUN npm install --global pnpm@10.34.6
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/auth-client/package.json ./services/auth-client/package.json

FROM dependencies AS production-dependencies
RUN --mount=type=cache,id=epa-auth-lab-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --prod --frozen-lockfile --store-dir /pnpm/store

FROM dependencies AS build
RUN --mount=type=cache,id=epa-auth-lab-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY services/auth-client/tsconfig*.json ./services/auth-client/
COPY services/auth-client/src ./services/auth-client/src
RUN pnpm --filter @epa-auth-lab/authorization build

FROM node:24.20.0-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/services/auth-client/node_modules ./services/auth-client/node_modules
COPY --from=build /app/services/auth-client/dist ./services/auth-client/dist
COPY services/auth-client/package.json ./services/auth-client/package.json

USER node
EXPOSE 3000
CMD ["node", "services/auth-client/dist/main.js"]
