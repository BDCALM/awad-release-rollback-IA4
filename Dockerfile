# Production Dockerfile for linkbox
FROM node:22.13-alpine

WORKDIR /app

# Ensure /data and /app exist and are owned by non-root user 'node'
RUN mkdir -p /data /app && chown -R node:node /data /app

# Copy application files with proper ownership
COPY --chown=node:node package.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node migrations/ ./migrations/

# Switch to non-root user
USER node

# Bake application version into the image (default to 1.0.0 if not supplied)
ARG APP_VERSION=1.0.0
ENV APP_VERSION=${APP_VERSION}

# Expose service ports (3000 for internal app, 8080 for ingress/traffic)
EXPOSE 3000
EXPOSE 8080

# Container healthcheck
HEALTHCHECK --interval=3s --timeout=3s --start-period=1s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the server directly in exec form so node is PID 1
CMD ["node", "src/server.js"]
