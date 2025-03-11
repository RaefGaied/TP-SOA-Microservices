const { v4: uuidv4 } = require('uuid');

const initializeTasks = async (db) => {
    try {
        
        const tasksExist = await db.get('lastId').catch(() => false);
        if (tasksExist) {
            console.log('✅ Tâches déjà initialisées');
            return;
        }

        const initialTasks = [
            {
                id: '1',
                title: 'Développement Front-end pour Site E-commerce',
                description: 'Créer une interface utilisateur réactive en utilisant React et Redux pour un site e-commerce.',
                completed: false,
                duration: 120,
            },
            {
                id: '2',
                title: 'Développement Back-end pour Authentification Utilisateur',
                description: "Implémenter un système d'authentification et d'autorisation pour une application web en utilisant Node.js, Express, et Passport.js",
                completed: false,
                duration: 180,
            },
            {
                id: '3',
                title: 'Tests et Assurance Qualité pour Application Web',
                description: 'Développer et exécuter des plans de test et des cas de test complets.',
                completed: false,
                duration: 90,
            },
        ];

        for (const task of initialTasks) {
            await db.put(task.id, task);
        }

        
        await db.put('lastId', '3'); 
        console.log('Tâches initiales ajoutées avec succès');
    } catch (error) {
        console.error(' Erreur lors de l’initialisation des tâches:', error);
    }
};


const taskResolver = {
    Query: {
        task: async (_, { id }, { db }) => {
            try {
                const task = await db.get(id);
                return task;
            } catch (error) {
                console.error('Erreur lors de la récupération de la tâche:', error);
                throw new Error('Tâche non trouvée');
            }
        },
        tasks: async (_, __, { db }) => {
            const tasks = [];
            try {
                for await (const [key, value] of db.iterator()) {
                    if (key !== 'lastId') { 
                        tasks.push(value);
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la récupération des tâches:', error);
                throw new Error('Erreur lors de la récupération des tâches');
            }
            return tasks;
        },
    },
    Mutation: {
        addTask: async (_, { title, description, completed = false, duration }, { db }) => {
            try {
               
                const lastId = await db.get('lastId').catch(() => '0'); 
                const id = String(Number(lastId) + 1); 
                const task = { id, title, description, completed, duration };
                await db.put(id, task);
                await db.put('lastId', id);

                console.log('Tâche ajoutée avec succès :', task); 
                return task;
            } catch (error) {
                console.error('Erreur lors de l’ajout de la tâche:', error);
                throw new Error('Erreur lors de l’ajout de la tâche');
            }
        },
        completeTask: async (_, { id }, { db }) => {
            try {
                const task = await db.get(id);
                task.completed = true;
                await db.put(id, task);
                return task;
            } catch (error) {
                console.error('Erreur lors de la mise à jour de la tâche:', error);
                throw new Error('Erreur lors de la mise à jour de la tâche');
            }
        },
        changeDescription: async (_, { id, description }, { db }) => {
            try {
                const task = await db.get(id).catch(() => null);
                if (!task) {
                    throw new Error('Tâche non trouvée');
                }
        
                console.log('Tâche avant mise à jour :', task); 
                task.description = description;
        
               
                await db.put(id, task);
        
                console.log('Tâche après mise à jour :', task); 
        
               
                return task;
            } catch (error) {
                console.error('Erreur lors de la modification de la description:', error);
                throw new Error('Erreur lors de la modification de la description');
            }
        },
        deleteTask: async (_, { id }, { db }) => {
            try {
                const task = await db.get(id).catch(() => null);
                if (!task) {
                    throw new Error('Tâche non trouvée');
                }

                await db.del(id); 
                return "Task deleted successfully";
            } catch (error) {
                console.error('Erreur lors de la suppression de la tâche:', error);
                throw new Error('Erreur lors de la suppression de la tâche');
            }
        },
    },
};

module.exports = { taskResolver, initializeTasks };