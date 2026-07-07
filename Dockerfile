# Stage 1: Build the static dashboard files
FROM oven/bun:1.1.20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build Vite application (outputs to dist/)
RUN bun run build

# Stage 2: Serve static content with Nginx
FROM nginx:1.27.0-alpine AS runner

# Copy built assets to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
