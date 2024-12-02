FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

RUN npm audit fix

COPY . .
# RUN npm run migrate:latest

CMD ["npm", "run", "start:prod"]



