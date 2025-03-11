const fs = require('fs');
const path = require('path');
const { buildSchema } = require('graphql');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);

async function getTaskSchema() {
    const schemaPath = path.join(__dirname, 'taskSchema.gql');

    try {
        const schemaString = await readFileAsync(schemaPath, { encoding: 'utf8' });
        console.log("Schéma GraphQL chargé avec succès !");
        return buildSchema(schemaString);
    } catch (error) {
        console.error(" Erreur lors de la lecture du fichier de schéma GraphQL:", error);
        throw error;
    }
}


module.exports = getTaskSchema;
