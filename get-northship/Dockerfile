FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY server.js analytics.js install.sh ./

RUN chmod +x /app/install.sh

EXPOSE 3000

# To enable TLS, mount certs and set TLS_CERT_PATH + TLS_KEY_PATH:
#   docker run -v /path/to/cert.pem:/certs/cert.pem -v /path/to/key.pem:/certs/key.pem \
#     -e TLS_CERT_PATH=/certs/cert.pem -e TLS_KEY_PATH=/certs/key.pem ...

CMD ["node", "server.js"]
