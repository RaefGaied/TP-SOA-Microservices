const { error } = require('dotenv').config();

if (error) throw new Error("⚠️  Fichier .env manquant");

const requiredVars = ['PGUSER', 'PGPASSWORD', 'KAFKA_BROKERS'];
requiredVars.forEach(varName => {
  if (!process.env[varName]) throw new Error(`⚠️  ${varName} manquant dans .env`);
});