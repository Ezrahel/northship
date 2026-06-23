FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ARG NORTHSHIP_COMMIT_SHA=unknown
ARG NORTHSHIP_IMAGE_SOURCE=https://github.com/ezrahel/northship

LABEL org.opencontainers.image.source=$NORTHSHIP_IMAGE_SOURCE
LABEL org.opencontainers.image.revision=$NORTHSHIP_COMMIT_SHA

ENV NODE_ENV=production \
    PORT=4310 \
    HOST=0.0.0.0 \
    DATA_DIR=/data \
    NORTHSHIP_COMMIT_SHA=$NORTHSHIP_COMMIT_SHA

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    openssl \
    openssh-client \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
  && chmod a+r /etc/apt/keyrings/docker.asc \
  && . /etc/os-release \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    docker-ce-cli \
    docker-compose-plugin \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://railpack.com/install.sh | sh -s -- --bin-dir /usr/local/bin

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server/assets ./src/server/assets

RUN mkdir -p /data
EXPOSE 4310

CMD ["node", "dist/server/index.js"]
