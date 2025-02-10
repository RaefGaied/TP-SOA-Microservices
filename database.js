const sqlite3 = require('sqlite3').verbose();

// Connexion à la base de données SQLite
const db = new sqlite3.Database('./maBaseDeDonnees.sqlite', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error("❌ Erreur de connexion à la base de données :", err.message);
    } else {
        console.log("✅ Connecté à la base de données SQLite.");

        // Création de la table si elle n'existe pas
        db.run(`CREATE TABLE IF NOT EXISTS personnes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            adresse TEXT
        )`, (err) => {
            if (err) {
                console.error("❌ Erreur lors de la création de la table :", err.message);
            } else {
                console.log("✅ Table 'personnes' créée ou déjà existante.");

                // Vérification si des données existent déjà
                db.get("SELECT COUNT(*) AS count FROM personnes", (err, row) => {
                    if (err) {
                        console.error("❌ Erreur lors de la vérification des données existantes :", err.message);
                    } else if (row.count === 0) {
                        // Insertion de quelques données initiales si la table est vide
                        const personnes = [
                            { nom: "Alice", adresse: "10 Rue des Lilas" },
                            { nom: "Bob", adresse: "25 Avenue du Parc" },
                            { nom: "Charlie", adresse: "5 Boulevard Haussmann" }
                        ];

                        personnes.forEach(({ nom, adresse }) => {
                            db.run(`INSERT INTO personnes (nom, adresse) VALUES (?, ?)`, [nom, adresse], (err) => {
                                if (err) {
                                    console.error("❌ Erreur lors de l'insertion des données :", err.message);
                                }
                            });
                        });

                        console.log("✅ Données initiales insérées.");
                    }
                });
            }
        });
    }
});

// Export de la base de données
module.exports = db;
