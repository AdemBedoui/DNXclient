# --- Stage 1: Build the Next.js app ---
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: Run the Next.js app in production ---
FROM node:20-slim
WORKDIR /app

# 1. Copy built app and node_modules from builder
COPY --from=builder /app .

# 2. Set a configurable port (default 3000)
ARG PORT=3000
ENV PORT=${PORT}

# 3. Expose the port
EXPOSE ${PORT}

# 4. Start Next.js in production mode, using the PORT env
CMD ["sh", "-c", "npm run start -- -p $PORT"]