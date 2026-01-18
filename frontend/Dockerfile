# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
# Copy package files
COPY package*.json ./
# Install dependencies
RUN npm install --legacy-peer-deps

# Accept build argument
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Copy source files (excluding node_modules)
COPY src ./src
COPY index.html ./
COPY postcss.config.js tailwind.config.js vite.config.js ./
# Build the application
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
# Expose port 80
EXPOSE 80
# Start nginx
CMD ["nginx", "-g", "daemon off;"]

