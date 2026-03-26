# ================================
# Stage 1: Base with dependencies
# ================================
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Copy prisma schema and config for client generation
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies
RUN bun install

# Generate Prisma client
RUN bunx prisma generate

# ================================
# Stage 2: Build
# ================================
FROM deps AS builder
WORKDIR /app

# Copy all source code
COPY . .

# Create database directory
RUN mkdir -p ./db

# Set database URL for build
ENV DATABASE_URL="file:./db/custom.db"

# Create .env file for Prisma
RUN echo 'DATABASE_URL="file:./db/custom.db"' > .env

# Initialize database
RUN bunx prisma db push --skip-generate

# Run seed script  
RUN bun run prisma/seed.ts

# Build Next.js
RUN bun run build

# ================================
# Stage 3: Production
# ================================
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:./db/custom.db"

# Create user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Install curl for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Copy standalone server
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy database with data
COPY --from=builder /app/db ./db

# Copy Prisma runtime files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create .env file
RUN echo 'DATABASE_URL="file:./db/custom.db"' > .env

# Fix permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

CMD ["bun", "server.js"]
