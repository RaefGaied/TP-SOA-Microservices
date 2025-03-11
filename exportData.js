const { Level } = require('level');
const fs = require('fs');

const db = new Level('./tasks-db', { valueEncoding: 'json' });

async function exportData() {
    try {
        const data = [];

        for await (const [key, value] of db.iterator()) {
            console.log(key, value);
            if (key !== 'lastId') {
                data.push(value);
            }
        }

        fs.writeFileSync('initialData.json', JSON.stringify(data, null, 2));
        console.log('Données exportées avec succès dans initialData.json');
    } catch (error) {
        console.error('Erreur lors de l’exportation des données:', error);
    } finally {
        await db.close();
    }
}

exportData();