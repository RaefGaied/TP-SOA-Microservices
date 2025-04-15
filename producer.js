const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

const run = async () => {
  await producer.connect();
  
  setInterval(async () => {
    try {
      const message = `Message à ${new Date().toLocaleTimeString()}`;
      await producer.send({
        topic: 'test-topic',
        messages: [{ value: message }],
      });
      console.log(`✅ Message envoyé: ${message}`);
    } catch (err) {
      console.error("❌ Erreur:", err);
    }
  }, 3000); 
};

run().catch(console.error);