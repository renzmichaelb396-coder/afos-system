# ============================================================
# AFOS System — Production Dockerfile
# Next.js 16 + Prisma 5 + Node.js 20 LTS (Debian slim)
#
# Uses node:20-slim (Debian) instead of Alpine to ensure
# Prisma's query engine binary (debian-openssl-3.0.x) works
# without libssl compatibility shims.
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
FROM node:20-slim AS deps
WORKDIR /app

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy manifests only — maximises layer cache reuse
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install all dependencies (dev deps needed for prisma generate + next build)
RUN pnpm install --frozen-lockfile

# Generate Prisma client (targets debian-openssl-3.0.x binary)
RUN npx prisma generate

# ── Stage 2: application build ─────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application (output: standalone)
# The standalone output bundles all required node_modules including Prisma client
RUN pnpm run build

# ── Stage 3: minimal production runtime ───────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install openssl for Prisma query engine (debian-openssl-3.0.x)
RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Create a non-root system user for security
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nextjs

# Copy the complete standalone server output.
# Next.js standalone mode bundles ALL required node_modules (including the
# full Prisma client + query engine binary) into .next/standalone/node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets (not included in standalone output)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema (needed for prisma migrate deploy at container start)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

# Health check — hits /api/health every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the standalone Next.js server
CMD ["node", "server.js"]
