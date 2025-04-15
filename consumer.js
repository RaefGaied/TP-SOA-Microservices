const { Kafka } = require('kafkajs');
const { Client } = require('pg');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

const pgClient = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'kafka_messages',
  password: 'raef123/*',
  port: 5432,
});

const consumer = kafka.consumer({ groupId: 'test-group' });

const run = async () => {

  await pgClient.connect();
  console.log('🟢 Connecté à PostgreSQL');
  

  await consumer.connect();
  await consumer.subscribe({ topic: 'test-topic', fromBeginning: true });
  
  await consumer.run({
    eachMessage: async ({ message }) => {
      const text = message.value.toString();
      console.log(`📩 Reçu: ${text}`);
      
      try {
        await pgClient.query(
          'INSERT INTO messages(content) VALUES($1)',
          [text]
        );
        console.log('💾 Message sauvegardé');
      } catch (err) {
        console.error('❌ Erreur DB:', err.message);
      }
    },
  });
};

run().catch(console.error);