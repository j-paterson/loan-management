FROM node:20-alpine

WORKDIR /app

# Copy shared package first
COPY shared /shared

# Copy package files
COPY frontend/package*.json ./

# Install dependencies (shared package is referenced as file:../shared)
RUN npm ci --ignore-scripts

# Copy source code
COPY frontend/ .

# Expose port
EXPOSE 5173

# Start Vite dev server
CMD ["npm", "run", "dev", "--", "--host"]
