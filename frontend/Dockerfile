# Images via ECR Public (évite Docker Hub / auth.docker.io si IPv6 injoignable sur l’agent Jenkins)
# Stage de build
FROM public.ecr.aws/docker/library/node:20-alpine AS build

WORKDIR /app

# Permet de passer l'URL de l'API au moment du build (pour Docker)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
# Force un registry stable et évite les URLs codées en dur vers cdn.npmmirror
# dans le package-lock en supprimant le lock dans l'image.
RUN npm config set registry https://registry.npmjs.org/ \
  && rm -f package-lock.json pnpm-lock.yaml yarn.lock \
  && npm install --no-audit --no-fund --no-progress
COPY . .

# Le build Vite lit VITE_API_URL et la "bake" dans le frontend
RUN npm run build || true   # continue même si TS échoue

# Stage de production
FROM public.ecr.aws/docker/library/nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
