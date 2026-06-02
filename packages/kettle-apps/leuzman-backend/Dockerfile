# # ─── Standalone build (VPS) ────────────────────────────────────────────────────
# # Use this when the leuzman-backend repo is cloned alone on the VPS.
# # No monorepo context needed — builds from the project directory only.
# #
# # docker compose up --build -d

# # ── Stage 1: Build ─────────────────────────────────────────────────────────────
# FROM node:22-alpine AS builder

# RUN apk add --no-cache python3 make g++
# RUN npm install -g pnpm@10 dotenv-cli

# WORKDIR /app

# # COPY package.json pnpm-lock.yaml ./
# COPY package.json ./
# RUN pnpm install

# COPY . .
# RUN pnpm run build

# # ── Stage 2: Production ────────────────────────────────────────────────────────
# FROM node:22-alpine AS runner

# RUN npm install -g pnpm@10 dotenv-cli
# WORKDIR /app

# # Medusa build output is a self-contained server folder
# COPY --from=builder /app/.medusa/server ./
# COPY --from=builder /app/start-prod.sh ./
# COPY --from=builder /app/src/scripts ./src/scripts
# COPY --from=builder /app/node_modules ./node_modules

# # RUN pnpm install --prod
# RUN chmod +x start-prod.sh

# EXPOSE 9000

# ENTRYPOINT ["./start-prod.sh"]

# Development Dockerfile for Medusa
FROM node:22-alpine

# Redirect HOME to /tmp so the Medusa CLI can write its config cache
# (/root is on a read-only overlay layer on some VPS Docker setups → EROFS)
ENV HOME=/tmp

# Set working directory
WORKDIR /server

# # Install pnpm globally
# RUN npm install pnpm -g

# # Copy package files and yarn config
# COPY pnpm-workspace.yaml* tsconfig.json package.json pnpm-lock.yaml* .env ./
COPY pnpm-workspace.yaml* tsconfig.json package.json .env ./
# COPY /medusa-qr ./medusa-qr
# COPY /medusa-product-ext ./medusa-product-ext
# COPY /medusa-stories ./medusa-stories

# RUN pnpm install

# # install plugin
# WORKDIR /server/medusa-qr
# # RUN pwd && ls -al && exit 1
# RUN pnpm install --filter medusa-qr --config.confirmModulesPurge=false 
# RUN pnpm build

# WORKDIR /server/medusa-product-ext
# # RUN pwd && ls -al && exit 1
# RUN pnpm install --filter medusa-product-ext --config.confirmModulesPurge=false 
# RUN pnpm build

# WORKDIR /server/medusa-stories
# # RUN pwd && ls -al && exit 1
# RUN pnpm install --filter medusa-stories --config.confirmModulesPurge=false 
# RUN pnpm build

WORKDIR /server

# Install dependencies using pnpm
# RUN pnpm install --frozen-lockfile

# Copy source code
# COPY . ./

RUN npm install -g pnpm@9.15.4

COPY ./medusa-product-ext ./medusa-product-ext
COPY ./medusa-qr ./medusa-qr
COPY ./medusa-stories ./medusa-stories
COPY ./medusa-social-commerce ./medusa-social-commerce
COPY ./ ./
COPY /src/scripts ./src/scripts
COPY /tsconfig.json ./
COPY /.env ./
COPY /start.sh ./
COPY /pnpm-workspace.yaml ./
COPY /package.json ./

RUN chmod +x start.sh
RUN mkdir -p /var/lib/medusa
RUN chmod -R 777 /var/lib/medusa

# Expose the port Medusa runs on
EXPOSE 9000

# Start with migrations and then the development server
ENTRYPOINT ["./start.sh"]