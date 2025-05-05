# Utilise l'image officielle Node.js version 22 avec Alpine Linux (léger)
FROM node:22-alpine

# Définit le répertoire de travail dans le conteneur
WORKDIR /app

# Copie les fichiers package.json et package-lock.json (si existant) dans le conteneur
# Cette étape est séparée pour optimiser le cache des couches Docker
COPY package*.json ./

# Installe uniquement les dépendances de production (pas les devDependencies)
RUN npm install --production

# Copie le fichier principal de l'application dans le conteneur
COPY index.js ./

# Expose le port 3001 pour permettre les connexions externes
# Note: Cela ne publie pas réellement le port, c'est juste une documentation
EXPOSE 3001

# Commande par défaut pour lancer l'application quand le conteneur démarre
CMD ["node", "index.js"]