# ---- Dockerfile ----
# Multi-stage build for the MC server status application

# Stage 1: Build the React frontend (Vite)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build

# Stage 2: Production image with backend and static assets
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy only the necessary parts from builder
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json ./

# Install only production dependencies (backend)
RUN npm ci --omit=dev

# Environment variables (override at runtime via docker run -e or docker-compose)
ENV ADMIN_USERNAME=admin \
    ADMIN_PASSWORD=admin \
    JWT_SECRET=change_me_in_production \
    DB_PATH=/app/data/database.sqlite

# Persist the database outside the container
VOLUME ["/app/data"]

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server/index.js"]
