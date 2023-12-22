### BUILD ###
FROM node:20-alpine AS builder

WORKDIR /tmp

COPY ../vue-client/package*.json .

RUN npm ci

COPY ../vue-client/ .

RUN npm run build

### RUN ###
FROM nginx:1.25

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /tmp/dist/ /usr/share/nginx/html/
