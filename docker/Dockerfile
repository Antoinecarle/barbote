# Barbote - Wine Traceability Platform
# Multi-stage Docker build

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server files
COPY server/ ./server/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3006/api/health || exit 1

# Non-root user
RUN addgroup -g 1001 barbote && \
    adduser -u 1001 -G barbote -s /bin/sh -D barbote
USER barbote

EXPOSE 3006
CMD ["node", "server/index.js"]
