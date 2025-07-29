FROM node:22-alpine3.20 as builder

# Add security updates and create non-root user
RUN apk update && apk upgrade && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Copy source code
COPY --chown=nodejs:nodejs . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Add security updates
RUN apk update && apk upgrade

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
