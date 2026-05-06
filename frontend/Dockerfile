# Les ARG utilisés dans FROM doivent être déclarés avant tout FROM (Docker BuildKit).
# Surcharge ECR si besoin :
# docker build --build-arg NODE_IMAGE=public.ecr.aws/docker/library/node:20-alpine --build-arg NGINX_IMAGE=public.ecr.aws/docker/library/nginx:alpine .
ARG NODE_IMAGE=node:20-alpine
ARG NGINX_IMAGE=nginx:alpine

FROM ${NODE_IMAGE} AS build

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

ARG VITE_USE_RELATIVE_API=false
ENV VITE_USE_RELATIVE_API=${VITE_USE_RELATIVE_API}

ARG VITE_BROWSER_BACKEND_PORT
ENV VITE_BROWSER_BACKEND_PORT=${VITE_BROWSER_BACKEND_PORT}

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

ARG VITE_GOOGLE_API_KEY
ENV VITE_GOOGLE_API_KEY=${VITE_GOOGLE_API_KEY}

COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ \
  && rm -f package-lock.json pnpm-lock.yaml yarn.lock \
  && npm install --no-audit --no-fund --no-progress
COPY . .

RUN npm run build

FROM ${NGINX_IMAGE}
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
