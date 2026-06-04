FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies first (cached layer if package files unchanged)
COPY package.json ./
COPY bun.lock* ./
RUN bun install

# Copy source
COPY src/ ./src/
COPY about_shop.md ./
COPY tsconfig.json ./

# Expose webhook port (nginx proxies :8443/bot/* → :4000/bot/*)
EXPOSE 4000

# Production: webhook mode. Set BOT_ENV=production + WEBHOOK_URL in env.
# Production entry point: multi-tenant webhook server.
# For single-tenant dev polling: bun src/bot.ts
CMD ["bun", "src/server.ts"]
