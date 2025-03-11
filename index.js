const express = require('express'); 
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { json } = require('body-parser');
const { addResolversToSchema } = require('@graphql-tools/schema');
const getTaskSchema = require('./taskSchema');
const { taskResolver, initializeTasks } = require('./taskResolver');
const { Level } = require('level');


const app = express();
const db = new Level('./tasks-db', { valueEncoding: 'json' });

db.open()
    .then(() => {
        console.log('Connecté à LevelDB');
        (async () => {
            console.log('Contenu de LevelDB :');
            for await (const [key, value] of db.iterator()) {
                console.log(`Clé : ${key}, Valeur :`, value);
            }
        })();
        initializeTasks(db);
    })
    .catch(err => {
        console.error('Erreur de connexion à LevelDB:', err);
        process.exit(1);
    });

async function setupServer() {
    try {
      
        const taskSchema = await getTaskSchema();
        const schemaWithResolvers = addResolversToSchema({
            schema: taskSchema,
            resolvers: taskResolver,
        });
        const server = new ApolloServer({
            schema: schemaWithResolvers,
        });
        await server.start();

       
        app.use(
            '/graphql',
            json(), 
            expressMiddleware(server, {
                context: async ({ req }) => {
                    return { db };
                },
            })
        );

       
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}/graphql`);
        });
    } catch (error) {
        console.error('Failed to start the Apollo server:', error);
        process.exit(1); 
    }
}


process.on('SIGINT', async () => {
    try {
        await db.close(); 
        console.log('Base de données LevelDB fermée avec succès');
        process.exit(0); 
    } catch (error) {
        console.error('Erreur lors de la fermeture de la base de données:', error);
        process.exit(1);
    }
});


setupServer();