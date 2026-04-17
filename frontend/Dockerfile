# Multi-stage build for frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Declare build argument for API URL
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy source files and configuration
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.ts postcss.config.js ./
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
