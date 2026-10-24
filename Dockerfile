FROM docker.m.daocloud.io/library/node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com \
  && npm ci --no-audit --no-fund

FROM docker.m.daocloud.io/library/node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run verify && npm run build

FROM docker.m.daocloud.io/library/node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
EXPOSE 3000
CMD ["npm","start"]
