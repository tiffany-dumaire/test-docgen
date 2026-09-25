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

# Réconcilie node_modules avec package.json au démarrage (utile quand le volume
# node_modules persiste alors que des dépendances ont été ajoutées), puis lance
# le serveur de dev Angular exposé sur toutes les interfaces du conteneur.
CMD ["sh", "-c", "npm install --no-audit --no-fund && npm start -- --host 0.0.0.0 --port 4200"]
