FROM node:20-alpine
WORKDIR /app
COPY services/customer/package*.json ./
RUN npm install --omit=dev
COPY services/customer/src ./src
COPY proto ./proto
ENV PROTO_DIR=/app/proto NODE_ENV=production
CMD ["node", "src/index.js"]
