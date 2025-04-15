🚀 TP6 – Système de Messagerie Temps Réel avec Kafka

Interface du dashboard développé:
![image](https://github.com/user-attachments/assets/a010e2df-0966-4ac2-a3f7-543cba0034d0)


🎯 Objectifs du TP
✔️ Implémenter un producteur et un consommateur Kafka

✔️ Persister les messages dans une base PostgreSQL

✔️ Développer une interface de visualisation (dashboard)

✔️ Concevoir une API REST avec Express

🏗️ Architecture Technique
mermaid
Copier
Modifier
flowchart LR
    A[Dashboard] -->|POST /send-message| B[API Express]
    B -->|Produce| C[(Kafka)]
    C -->|Consume| D[Consumer]
    D -->|Store| E[(PostgreSQL)]
    B -->|GET /messages| E
    E -->|Retrieve| A
🗂️ Structure du Projet
bash
Copier
Modifier
TP6-Kafka/
├── public/               # Frontend (HTML/CSS/JS)
│   ├── css/style.css
│   ├── js/script.js
│   └── index.html
├── server.js             # API REST Express
├── producer.js           # Producteur Kafka
├── consumer.js           # Consommateur Kafka + PostgreSQL
├── package.json          # Dépendances
├── .env.example          # Fichier d'exemple pour la configuration
└── README.md             # Documentation
⚙️ Installation & Configuration
✅ Prérequis
Node.js v18+

PostgreSQL 15+

Kafka 3.4+

📥 Installation
bash
Copier
Modifier
git clone https://github.com/RaefGaied/TP-SOA-Microservices.git
cd TP-SOA-Microservices
git checkout TP6-Kafka
npm install
cp .env.example .env
🧾 Configuration du fichier .env
ini
Copier
Modifier
# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=tp6-messages

# PostgreSQL
PGUSER=postgres
PGPASSWORD=mot_de_passe
PGDATABASE=kafka_tp6
🚀 Lancement de l’Application
Utiliser 3 terminaux séparés pour lancer les services :

Terminal	Commande	Description
1	npm run kafka:start	Démarre Zookeeper et Kafka
2	npm run dev	Démarre le serveur Express
3	npm run kafka:consumer	Lance le consommateur Kafka
➡️ Accéder au dashboard à l'adresse : http://localhost:3000

⚙️ Fonctionnalités
🖥 Frontend (Dashboard)
Envoi de messages en mode manuel ou automatique

Affichage en temps réel des messages

Interface responsive avec Bootstrap

🛠 Backend (API Express)
Endpoints REST :

http
Copier
Modifier
POST /send-message   # Envoie un message
GET  /messages       # Récupère tous les messages
Sécurité :

Validation des entrées

Gestion des erreurs

📊 Résultats de Test
bash
Copier
Modifier
# Test de performance :
1000 messages envoyés en 12.4 secondes
Débit moyen : ~80 msg/sec
Latence moyenne : 45 ms
📝 Compte Rendu
❗ Difficultés rencontrées
Synchronisation entre Kafka et PostgreSQL

Gestion des connexions simultanées

Intégration temps réel dans le dashboard

✅ Solutions apportées
Mise en place d’un mécanisme de reconnexion automatique

Contrôle du flux de messages

Optimisation des requêtes SQL

