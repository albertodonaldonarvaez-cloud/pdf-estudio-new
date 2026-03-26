# ================================
# Stage 1: Builder
# ================================
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN bun install

# Create necessary directories
RUN mkdir -p ./db
RUN mkdir -p ./.config

# Generate Prisma client
RUN bunx prisma generate

# Initialize database
RUN bunx prisma db push --skip-generate

# Run seed to create users
RUN bun run prisma/seed.ts

# Build the application
RUN bun run build

# ================================
# Stage 2: Production Runner
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

# Copy database
COPY --from=builder /app/db ./db

# Copy Prisma files for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/.config ./.config

# Copy .env
COPY --from=builder /app/.env ./

# Set proper permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "server.js"]
