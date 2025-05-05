# Utilise l'image officielle Node.js version 22 basée sur Alpine Linux (version légère)
FROM node:22-alpine

# Définit le répertoire de travail dans le conteneur comme /app
WORKDIR /app

# Copie les fichiers package.json et package-lock.json dans le conteneur
# Séparé pour optimiser l'utilisation du cache Docker
COPY package*.json ./

# Installe uniquement les dépendances de production (exclut les devDependencies)
RUN npm install --production

# Copie le fichier principal de l'application (index.js) dans le conteneur
COPY index.js ./

# Déclare le port 3002 comme étant exposé par l'application
# (Note: nécessite -p 3002:3002 dans docker run pour être effectivement publié)
EXPOSE 3002

# Commande par défaut exécutée au lancement du conteneur
CMD ["node", "index.js"]