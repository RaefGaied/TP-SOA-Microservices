# 📚 TP7 - Architecture Microservices avec REST, GraphQL, gRPC et Kafka

![Architecture Diagram](docs/architecture.png)

## 🌟 Fonctionnalités Principales

- ✅ API **REST** complète (CRUD)
- ✅ Serveur **GraphQL** avec Apollo
- ✅ Communication **gRPC** entre services
- ✅ Messagerie événementielle avec **Kafka**
- ✅ Système de **cache mémoire**
- ✅ **Gestion centralisée des erreurs**

---

## 🛠️ Prérequis

- [Node.js](https://nodejs.org/) v18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Kafka (inclus dans le `docker-compose`)

---

## ✨ Installation et Lancement

```bash
# 1. Cloner le dépôt
git clone -b TP7 https://github.com/RaefGaied/TP-SOA-Microservices.git
cd TP-SOA-Microservices

# 2. Installer les dépendances
npm install

# 3. Démarrer l'infrastructure (Kafka, services, etc.)
docker-compose up -d
```

---

## 🔗 Endpoints Clés

### 📡 API REST

| Méthode | Endpoint    | Description       | Exemple                                                                 |
|---------|-------------|-------------------|-------------------------------------------------------------------------|
| GET     | `/movies`   | Lister les films  | `curl http://localhost:3000/movies`                                     |
| POST    | `/movies`   | Créer un film     | `curl -X POST -H "Content-Type: application/json" -d '{"title":"Inception"}' http://localhost:3000/movies` |

---

### 🎯 GraphQL

**Accès au playground :**

[http://localhost:3000/graphql](http://localhost:3000/graphql)

**Exemple de requête :**

```graphql
query GetMovies {
  searchMovies(query: "Inception") {
    id
    title
    createdAt
  }
}
```

---

### ⚙️ Configuration Kafka (`docker-compose.yml`)

```yaml
services:
  kafka:
    image: confluentinc/cp-kafka:7.4.0
    ports:
      - "29092:29092"
    environment:
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
```

---

## 🧲 Tests Automatisés

```bash
# Lancer les tests unitaires
npm test

# Tester la connexion à Kafka
node tests/kafka.test.js

# Vérifier les services gRPC
node tests/grpc.test.js
```

---

## 📊 Dashboard de Monitoring

**Health Check :** `GET /health`

```json
{
  "status": "healthy",
  "services": {
    "kafka": true,
    "movieService": true
  },
  "cacheStats": {
    "hitRate": 0.85
  }
}
```

---

## 🔧 Développement

```bash
# Mode développement avec reload automatique
npm run dev

# Générer les stubs gRPC
npm run generate:grpc

# Lancer tous les services en parallèle
npm run start:all
```

---

## 📝 Journal des Modifications

| Version | Date       | Description             |
|---------|------------|-------------------------|
| v1.0    | 2024-06-01 | Version initiale        |
| v1.1    | 2024-06-02 | Ajout système de cache  |

---

## ❓ Support

- 📬 Contact : [raef.gaied@email.com](mailto:raef.gaied@email.com)
- 🐛 Signaler un bug via [Issues GitHub](https://github.com/RaefGaied/TP-SOA-Microservices/issues)
