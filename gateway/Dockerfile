FROM node:20-alpine
WORKDIR /app
COPY gateway/package*.json ./
RUN npm install --omit=dev
COPY gateway/src ./src
COPY proto ./proto
ENV PROTO_DIR=/app/proto NODE_ENV=production
EXPOSE 8080
CMD ["node", "src/index.js"]
