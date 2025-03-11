const level = require('level');


const db = level('./tasksDB', { valueEncoding: 'json' });

const connectDB = async () => {
    try {
        console.log('✅ LevelDB connected successfully');
    } catch (error) {
        console.error('❌ Erreur de connexion à LevelDB:', error);
        process.exit(1);
    }
};

module.exports = { db, connectDB };