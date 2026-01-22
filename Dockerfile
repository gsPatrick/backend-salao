# Use Node.js LTS (Alpine for smaller image size)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 3001

# Command to run the application
CMD ["node", "server.js"]
