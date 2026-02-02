FROM node:20-alpine

WORKDIR /app

# Copy shared package first
COPY shared /shared

# Copy package files
COPY backend/package*.json ./

# Install dependencies (shared package is referenced as file:../shared)
RUN npm ci --ignore-scripts

# Copy source code
COPY backend/ .

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "run", "dev"]
