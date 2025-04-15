# 🚀 TP6 - Système de Messagerie Temps-Réel avec Kafka

![Dashboard Kafka](screenshots/dashboard.png)  
*Capture d'écran du dashboard*

## 📌 Objectifs du TP
- [x] Implémenter un producteur/consommateur Kafka
- [x] Stocker les messages dans PostgreSQL
- [x] Développer un dashboard de visualisation
- [x] Créer une API REST avec Express

## 🏗 Architecture Technique

```mermaid
flowchart LR
    A[Dashboard] -->|POST /send-message| B[API Express]
    B -->|Produce| C[(Kafka)]
    C -->|Consume| D[Consumer]
    D -->|Store| E[(PostgreSQL)]
    B -->|GET /messages| E
    E -->|Retrieve| A
📂 Structure des Fichiers
Copy
TP6-Kafka/
├── public/               # Frontend
│   ├── css/style.css
│   ├── js/script.js
│   └── index.html
├── server.js             # API Express
├── producer.js           # Producteur Kafka
├── consumer.js           # Consommateur + PostgreSQL
├── package.json
├── .env.example          # Configuration
└── README.md
🛠 Installation
Prérequis :

Node.js v18+

PostgreSQL 15+

Kafka 3.4+

Configuration :

bash
Copy
git clone https://github.com/RaefGaied/TP-SOA-Microservices.git
cd TP-SOA-Microservices
git checkout TP6-Kafka
npm install
cp .env.example .env
Configurer .env :

ini
Copy
# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=tp6-messages

# PostgreSQL
PGUSER=postgres
PGPASSWORD=votre_mdp
PGDATABASE=kafka_tp6
🚀 Lancement
Dans des terminaux séparés :

Terminal	Commande	Description
1	npm run kafka:start	Lance Zookeeper + Kafka
2	npm run dev	Démarre le serveur Express
3	npm run kafka:consumer	Lance le consommateur Kafka
Accédez au dashboard : http://localhost:3000

🔍 Fonctionnalités Implémentées
Backend
API REST :

http
Copy
POST /send-message {message: "test"}
GET /messages
Sécurité :

Validation des entrées

Gestion des erreurs

Frontend
Dashboard :

Mode manuel/automatique

Affichage temps-réel

Design responsive

📊 Résultats de Test
bash
Copy
# Test de performance
1000 messages envoyés en 12.4s
Throughput: ~80 msg/s
Latence moyenne: 45ms
📝 Compte Rendu
Difficultés Rencontrées
Synchronisation Kafka/PostgreSQL

Gestion des connexions simultanées

Intégration du dashboard

Solutions Apportées
Mécanisme de reconnexion automatique

Contrôle de flux des messages

Optimisation des requêtes SQL
