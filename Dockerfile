FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create data directory for database
RUN mkdir -p data

# Expose port (if needed for health checks)
EXPOSE 3000

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S navigi -u 1001

# Change ownership of app directory
RUN chown -R navigi:nodejs /app
USER navigi

# Start the bot
CMD ["npm", "start"]