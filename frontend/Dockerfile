# Image de développement pour le frontend Angular (DocuGen)
FROM node:24-slim

ENV NODE_ENV=development

WORKDIR /app

# Installation des dépendances (couche cachée tant que package*.json ne bouge pas)
COPY package.json package-lock.json ./
RUN npm ci || npm install

# Le code est monté en volume par docker-compose en développement.
COPY . .

EXPOSE 4200

# Serveur de dev Angular, exposé sur toutes les interfaces du conteneur.
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200"]
