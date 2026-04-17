# Multi-stage build for backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy source code and configuration
COPY src/ ./src/
COPY tsconfig.json ./

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Copy dist and node_modules from builder
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/node_modules ./node_modules/

# Change to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/server.js"]
