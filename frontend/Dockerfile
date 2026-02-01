FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start the dev server with host flag for Docker
CMD ["npm", "run", "dev", "--", "--host"]
