FROM node:20-alpine

RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN pnpm run build

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod

EXPOSE 3847

CMD ["node", "dist/index.js"]
