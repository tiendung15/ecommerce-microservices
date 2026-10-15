FROM node:20-alpine
WORKDIR /app
COPY services/auth/package*.json ./
RUN npm install --omit=dev
COPY services/auth/src ./src
COPY proto ./proto
ENV PROTO_DIR=/app/proto NODE_ENV=production
CMD ["node", "src/index.js"]
