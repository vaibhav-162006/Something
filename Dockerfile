FROM oven/bun:1

# Prisma needs OpenSSL, and the base image may not include it
RUN apt-get update -y \
 && apt-get install -y openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock* bun.lockb* ./
RUN bun install

COPY . .
RUN bunx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "bunx prisma migrate deploy && bun src/index.ts"]
