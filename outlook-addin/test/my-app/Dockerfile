# --- Build stage ---
FROM node:18-alpine AS build

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build optimized React app
RUN npm run build

# --- Runtime stage ---
FROM node:18-alpine

WORKDIR /app

# Install a lightweight static server
RUN npm install -g serve

# Copy built app from previous stage
COPY --from=build /app/build ./build

EXPOSE 3000

# Serve the production build
CMD ["serve", "-s", "build", "-l", "3000"]