# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build server (bundled - no external deps needed)
RUN npm run build:server

# Production stage - minimal
FROM node:20-slim

WORKDIR /app

# Copy only the bundled server file
COPY --from=builder /app/dist-server ./dist-server

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Start server
CMD ["node", "dist-server/index.js"]
