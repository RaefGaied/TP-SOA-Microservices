const express = require('express');
const db = require('./database');

const app = express();
app.use(express.json());

const PORT = 3000;


app.get('/', (req, res) => {
    res.json("Registre de personnes! Choisissez le bon routage!");
});

app.get('/personnes', (req, res) => {
    db.all("SELECT * FROM personnes", [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": rows });
    });
});


app.get('/personnes/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM personnes WHERE id = ?", [id], (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": row });
    });
});


app.post('/personnes', (req, res) => {
    const { nom, adresse } = req.body;
    
    if (!nom) {
        res.status(400).json({ "error": "Le champ 'nom' est requis" });
        return;
    }

    db.run(`INSERT INTO personnes (nom, adresse) VALUES (?, ?)`, [nom, adresse || null], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": { id: this.lastID, nom, adresse } });
    });
});

app.put('/personnes/:id', (req, res) => {
    const id = req.params.id;
    const { nom, adresse } = req.body;

    if (!nom) {
        res.status(400).json({ "error": "Le champ 'nom' est requis" });
        return;
    }

    db.run(`UPDATE personnes SET nom = ?, adresse = ? WHERE id = ?`, [nom, adresse || null, id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": { id, nom, adresse } });
    });
});


app.delete('/personnes/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM personnes WHERE id = ?`, id, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success" });
    });
});

app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
