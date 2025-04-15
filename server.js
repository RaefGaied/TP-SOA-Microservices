require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const path = require('path');
const morgan = require('morgan'); 
const { Kafka, Partitioners } = require('kafkajs');

const app = express();
const PORT = process.env.PORT || 3000;


const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'kafka-dashboard',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});


const pgClient = new Client({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'kafka_messages',
  password: process.env.PGPASSWORD || 'raef123/*',
  port: process.env.PGPORT || 5432,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

let isDbConnected = false;
let isKafkaConnected = false;

const initializeDatabase = async () => {
  try {
    await pgClient.connect();
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    isDbConnected = true;
    console.log('🟢 PostgreSQL: Connecté et table vérifiée');
  } catch (err) {
    console.error('❌ PostgreSQL Erreur:', err.message);
    setTimeout(initializeDatabase, 5000);
  }
};

const initializeKafka = async () => {
  try {
    await producer.connect();
    isKafkaConnected = true;
    console.log('🟢 Kafka Producer: Connecté');
  } catch (err) {
    console.error('❌ Kafka Erreur:', err.message);
    setTimeout(initializeKafka, 5000);
  }
};

const checkServices = (req, res, next) => {
  if (!isDbConnected || !isKafkaConnected) {
    return res.status(503).json({ 
      error: 'Service indisponible',
      details: 'Connexion aux services en cours...'
    });
  }
  next();
};


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/send-message', checkServices, async (req, res) => {
  const { message } = req.body;
  
  if (!message?.trim()) {
    return res.status(400).json({ 
      error: 'Message invalide',
      details: 'Le contenu ne peut pas être vide'
    });
  }

  try {
    await producer.send({
      topic: process.env.KAFKA_TOPIC || 'test-topic',
      messages: [{ value: message }]
    });
    const result = await pgClient.query(
      `INSERT INTO messages(content) 
       VALUES($1) 
       RETURNING id, content, to_char(received_at, 'YYYY-MM-DD HH24:MI:SS') as received_at`,
      [message.trim()]
    );

    res.status(201).json({
      success: true,
      message: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.get('/messages', checkServices, async (req, res) => {
  try {
    const { rows } = await pgClient.query(`
      SELECT id, content, 
             to_char(received_at, 'YYYY-MM-DD HH24:MI:SS') as received_at
      FROM messages 
      ORDER BY received_at DESC
      LIMIT 100
    `);
    
    res.json(rows);
  } catch (err) {
    console.error('Erreur DB:', err);
    res.status(500).json({ 
      error: 'Erreur de chargement',
      details: 'Impossible de récupérer les messages'
    });
  }
});


app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(500).json({ 
    error: 'Erreur inattendue',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});


const startServer = async () => {
  await initializeDatabase();
  await initializeKafka();
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Serveur prêt sur http://localhost:${PORT}`);
    console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Topic Kafka: ${process.env.KAFKA_TOPIC || 'test-topic'}`);
  });
};

const shutdown = async () => {
  console.log('\n⏹️  Arrêt du serveur...');
  try {
    await Promise.all([
      pgClient.end(),
      producer.disconnect()
    ]);
    console.log('✅ Services déconnectés');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de la fermeture:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Démarrage
startServer().catch(err => {
  console.error('❌ Échec du démarrage:', err);
  process.exit(1);
});