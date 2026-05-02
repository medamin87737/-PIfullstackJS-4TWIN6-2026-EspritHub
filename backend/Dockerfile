# Évite Docker Hub si IPv6 vers auth.docker.io est injoignable (agent Jenkins)
FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]

