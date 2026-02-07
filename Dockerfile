# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --legacy-peer-deps --omit=dev && \
    npm cache clean --force

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDependencies)
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Build frontend (Vite)
RUN npx vite build

# Build server (esbuild)
RUN npx esbuild server/index.prod.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --format=esm \
    --outdir=dist-server \
    --packages=external

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Copy necessary config files
COPY package.json ./

# Create uploads directory with correct permissions
RUN mkdir -p uploads && chown -R appuser:nodejs uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3064

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3064

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3064/api/health || exit 1

# Start the application
CMD ["node", "dist-server/index.js"]
