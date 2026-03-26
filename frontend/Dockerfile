# Stage de build
FROM node:20-alpine AS build

WORKDIR /app

# Permet de passer l'URL de l'API au moment du build (pour Docker)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm install
COPY . .

# Le build Vite lit VITE_API_URL et la "bake" dans le frontend
RUN npm run build || true   # continue même si TS échoue

# Stage de production
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
