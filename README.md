# TP Kong - Gateway API pour Microservices

![Kong Gateway](https://konghq.com/wp-content/uploads/2018/05/kong-logo-github-readme.png)

## 📝 Description
Ce projet implémente un gateway API avec Kong pour gérer deux microservices :
- **Service A** : Gestion des utilisateurs (`/users`)
- **Service B** : Gestion des produits (`/products`)

## 🛠️ Technologies
- **Kong** : Gateway API
- **Docker** : Containerisation
- **Node.js** : Microservices (v22)

## 🚀 Installation

### Prérequis
- Docker et Docker Compose installés
- Ports 8000, 8001, 8443, 8444 disponibles

### Lancement
```bash
docker compose up -d --build
```

## 🌐 Endpoints

| Service   | Route       | Méthode | Description          |
|-----------|-------------|---------|----------------------|
| Service A | `/users`    | GET     | Liste des utilisateurs |
| Service B | `/products` | GET     | Liste des produits    |

## 🔍 Test des services
```bash
# Tester le service users
curl http://localhost:8000/users

# Tester le service products
curl http://localhost:8000/products

# Vérifier les services dans Kong
curl http://localhost:8001/services
```

## 📊 Structure du projet
```
tp-kong/
├── docker-compose.yml    # Configuration Docker
├── kong.yml             # Déclaration Kong
├── service-a/           # Microservice A
│   ├── index.js         # Implémentation
│   └── package.json     # Dépendances
└── service-b/           # Microservice B
    ├── index.js
    └── package.json
```

## 📸 Captures d'écran
![Test Users](![image](https://github.com/user-attachments/assets/014874ab-fde0-46f7-9aec-7dafe6810497)
)
*Résultat de /users*

![Test Products](screenshots/products.png)
*Résultat de /products*

## 📚 Documentation
- [Documentation Kong](https://docs.konghq.com/gateway/)
- [Docker Compose](https://docs.docker.com/compose/)

## ✍️ Auteur
Raef Gaied - 4eme anne genie logiciel
