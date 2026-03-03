# ============================================================
# AFOS System — Production Dockerfile
# Next.js 16 + Prisma 5 + Node.js 20 LTS (Alpine)
#
# Build:
#   docker build -t afos-system:latest .
#
# Run:
#   docker run -d -p 3000:3000 --env-file .env.production \
#     --name afos-prod afos-system:latest
#
# Secrets are NEVER baked into the image.
# Inject DATABASE_URL and all other secrets via --env-file or
# your platform's secret manager at container start time.
# ============================================================

# ── Stage 1: dependency installation ──────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy manifests only — maximises layer cache reuse
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install all dependencies (dev deps needed for prisma generate + next build)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN npx prisma generate

# ── Stage 2: application build ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application (output: standalone)
RUN pnpm run build

# ── Stage 3: minimal production runtime ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root system user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema + generated client (needed at runtime for migrations)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# Health check — hits /api/health every 30s
# Allows 10s for the process to start, retries 3 times before marking unhealthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start the standalone Next.js server
CMD ["node", "server.js"]
