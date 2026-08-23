# ============================================================
# CivicPulse AI — Frontend Dockerfile (Multi-Stage Build)
# Stage 1: Build the React/Vite app
# Stage 2: Serve via Nginx
# ============================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the frontend source
COPY . .

# Accept the backend API URL as a build argument
# This gets baked into the static JS bundle at build time.
# The browser calls this URL directly, so it must be a host-accessible address.
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build the production bundle
RUN npm run build

# ---- Stage 2: Serve ----
FROM nginx:stable-alpine AS serve

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config (SPA routing + security headers)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (standard HTTP)
EXPOSE 80

# Nginx runs in foreground by default in official image
CMD ["nginx", "-g", "daemon off;"]
