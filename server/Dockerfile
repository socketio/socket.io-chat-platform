FROM node:20-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

USER node

RUN npm ci --omit=dev

COPY --chown=node:node . .

EXPOSE 3000

CMD [ "node", "entrypoint.js" ]
