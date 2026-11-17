# On Bade — dev container (Expo / Metro)
# Node 26.13.0 = latest stable (LTS "Lithium"), npm 12.2.2 = latest npm, as of 2026-11-05.
FROM node:26.13.0-bookworm-slim

RUN npm install -g npm@12.2.2 \
 && apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Metro bundler (Expo Go connects here)
EXPOSE 8081

ENV EXPO_NO_TELEMETRY=1
CMD ["npx", "expo", "start", "--lan"]
