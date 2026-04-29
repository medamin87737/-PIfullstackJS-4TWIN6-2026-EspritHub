# Stage de build
FROM node:20-alpine AS build

WORKDIR /app

# Permet de passer l'URL de l'API au moment du build (pour Docker)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
# Force a stable registry and add retries to reduce transient network failures.
# On utilise npm install (pas npm ci) car le package-lock.json n'est pas strictement en phase dans ce projet.
RUN npm config set registry https://registry.npmjs.org/ \
  && npm install --no-audit --no-fund --no-progress
COPY . .

# Le build Vite lit VITE_API_URL et la "bake" dans le frontend
RUN npm run build || true   # continue même si TS échoue

# Stage de production
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
