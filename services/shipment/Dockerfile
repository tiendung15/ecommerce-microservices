FROM node:20-alpine
WORKDIR /app
COPY services/shipment/package*.json ./
RUN npm install --omit=dev
COPY services/shipment/src ./src
COPY services/shipment/scripts ./scripts
COPY proto ./proto
ENV PROTO_DIR=/app/proto NODE_ENV=production
CMD ["node", "src/index.js"]
