FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --include=dev
COPY backend/ ./
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
