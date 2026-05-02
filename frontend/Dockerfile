# Défaut : Docker Hub. Surcharge ECR si besoin sur l'agent qui build :
# docker build --build-arg NODE_IMAGE=public.ecr.aws/docker/library/node:20-alpine --build-arg NGINX_IMAGE=public.ecr.aws/docker/library/nginx:alpine .
ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE} AS build

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ \
  && rm -f package-lock.json pnpm-lock.yaml yarn.lock \
  && npm install --no-audit --no-fund --no-progress
COPY . .

RUN npm run build || true

ARG NGINX_IMAGE=nginx:alpine
FROM ${NGINX_IMAGE}
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
