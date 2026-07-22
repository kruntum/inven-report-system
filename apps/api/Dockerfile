# Stage 1: Build & install dependencies
FROM oven/bun:1.1-alpine AS base
WORKDIR /usr/src/app

# Stage 2: Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lockb* /temp/prod/
RUN cd /temp/prod && bun install

# Stage 3: Development setup / Full build
FROM base AS dev-install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb* /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Stage 4: Run production release
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

# Run the app
USER bun
EXPOSE 6001/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
