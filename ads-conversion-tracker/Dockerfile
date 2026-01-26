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

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3001/health').then(r => r.status === 200 ? process.exit(0) : process.exit(1))"

# Start server
CMD ["bun", "run", "src/server.ts"]
