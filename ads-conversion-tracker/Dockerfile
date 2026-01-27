FROM oven/bun:1.3.6-slim

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY src ./src
COPY public ./public
COPY tsconfig.json .

# Create non-root user with different UID (avoiding conflict with base image)
# If UID 1000 already exists, use UID 1001
RUN useradd -m -u 1001 appuser 2>/dev/null || useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3001/health').then(r => r.status === 200 ? process.exit(0) : process.exit(1))"

# Start server
CMD ["bun", "run", "src/server.ts"]
