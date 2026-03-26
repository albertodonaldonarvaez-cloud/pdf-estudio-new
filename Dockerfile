# ================================
# Stage 1: Dependencies
# ================================
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lockb* ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bunx prisma generate

# ================================
# Stage 2: Build
# ================================
FROM deps AS builder
WORKDIR /app

# Copy source code
COPY . .

# Create database directory and initialize
RUN mkdir -p ./db

# Initialize database with schema
RUN bunx prisma db push --skip-generate

# Run seed script to create initial users
RUN bun run prisma/seed.ts

# Build the Next.js application
RUN bun run build

# ================================
# Stage 3: Production Runner
# ================================
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:./db/custom.db

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy database from builder
COPY --from=builder /app/db ./db

# Copy Prisma schema and client for runtime operations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy .env for runtime config
COPY --from=builder /app/.env ./

# Set proper permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "server.js"]
