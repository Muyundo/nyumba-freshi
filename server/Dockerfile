FROM node:20-alpine

WORKDIR /app

# Install network tools for healthcheck/wait-for
RUN apk add --no-cache netcat-openbsd wget

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN chmod +x ./docker-entrypoint.sh || true

EXPOSE 4000
ENV PORT=4000

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["./docker-entrypoint.sh"]
