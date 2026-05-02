# Défaut : Docker Hub (souvent OK depuis Jenkins sur Docker Desktop).
# Si auth.docker.io / IPv6 bloque sur un agent : docker build --build-arg NODE_IMAGE=public.ecr.aws/docker/library/node:20-alpine .
ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE}

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
