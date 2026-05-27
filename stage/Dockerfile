FROM node:22-alpine
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm dotenv-cli

WORKDIR /app

# 1. Install all deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# 2. Copy source and Build
COPY . .
RUN pnpm run build

# 3. CRITICAL FIX: 
# Move the compiled config and entry files to the WORKDIR root
# so 'medusa start' finds them immediately.
# RUN cp /app/.medusa/server ./.medusa/server
WORKDIR /app/.medusa/server
RUN pnpm install --prod

RUN cp /app/start.sh ./start.sh
RUN chmod +x ./start.sh



EXPOSE 9000 5173

# RUN chmod +x start.sh
ENTRYPOINT ["./start.sh"]
