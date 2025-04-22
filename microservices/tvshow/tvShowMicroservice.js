const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const { Kafka } = require('kafkajs');


const tvShowProtoPath = path.join(__dirname, '../../proto/tvShow.proto');
const tvShowProtoDefinition = protoLoader.loadSync(tvShowProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const tvShowProto = grpc.loadPackageDefinition(tvShowProtoDefinition).tvShow;

const mongoUri = 'mongodb://localhost:27017';
const dbName = 'tvshow_service';
const collectionName = 'tvshows';

async function connectDB() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  return client.db(dbName).collection(collectionName);
}

const kafka = new Kafka({
  clientId: 'tvshow-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function sendKafkaEvent(eventType, tvshow) {
  await producer.connect();
  await producer.send({
    topic: 'tvshows_topic',
    messages: [{
      value: JSON.stringify({
        event_type: eventType,
        tvshow,
        timestamp: new Date().toISOString(),
        service: 'tvshow-service'
      })
    }]
  });
  await producer.disconnect();
}


const tvShowService = {
  getTvshow: async (call, callback) => {
    try {
      const db = await connectDB();
      const tvshow = await db.findOne({ _id: new ObjectId(call.request.tv_show_id) });
      
      if (tvshow) {
        callback(null, { tv_show: tvshow });
      } else {
        callback({
          code: grpc.status.NOT_FOUND,
          details: 'TV Show not found'
        });
      }
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        details: err.message
      });
    }
  },

  searchTvshows: async (call, callback) => {
    try {
      const db = await connectDB();
      const query = call.request.query || '';
      const filter = query ? { 
        $text: { $search: query } 
      } : {};
      
      const tvshows = await db.find(filter).toArray();
      callback(null, { tv_shows: tvshows });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        details: err.message
      });
    }
  },

  createTvshow: async (call, callback) => {
    try {
      const db = await connectDB();
      const tvshowData = {
        title: call.request.title,
        description: call.request.description,
        seasons: call.request.seasons || 1,
        episodes: call.request.episodes || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = await db.insertOne(tvshowData);
      const createdTVShow = {
        id: result.insertedId.toString(),
        ...tvshowData
      };
      
      await sendKafkaEvent('TVSHOW_CREATED', createdTVShow);
      callback(null, { tv_show: createdTVShow });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        details: err.message
      });
    }
  },

  updateTvshow: async (call, callback) => {
    try {
      const db = await connectDB();
      const updateData = {
        title: call.request.title,
        description: call.request.description,
        seasons: call.request.seasons,
        episodes: call.request.episodes,
        updated_at: new Date().toISOString()
      };
      
      const result = await db.findOneAndUpdate(
        { _id: new ObjectId(call.request.tv_show_id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      await sendKafkaEvent('TVSHOW_UPDATED', result.value);
      callback(null, { tv_show: result.value });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        details: err.message
      });
    }
  },

  deleteTvshow: async (call, callback) => {
    try {
      const db = await connectDB();
      const tvshow = await db.findOne({ _id: new ObjectId(call.request.tv_show_id) });
      
      if (!tvshow) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: 'TV Show not found'
        });
      }
      
      await db.deleteOne({ _id: new ObjectId(call.request.tv_show_id) });
      await sendKafkaEvent('TVSHOW_DELETED', tvshow);
      
      callback(null, { success: true });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        details: err.message
      });
    }
  }
};


async function startKafkaConsumer() {
  const consumer = kafka.consumer({ groupId: 'tvshow-service-group' });
  
  await consumer.connect();
  await consumer.subscribe({ 
    topics: ['movies_topic', 'tvshows_topic'],
    fromBeginning: true 
  });
  
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const event = JSON.parse(message.value.toString());
      console.log(`[${topic}] ${event.event_type}:`, event.movie || event.tvshow);
      if (topic === 'movies_topic' && event.event_type === 'MOVIE_DELETED') {
        console.log('Un film lié a été supprimé, vérifier les séries associées');
      }
    },
  });
}


const server = new grpc.Server();
server.addService(tvShowProto.TVShowService.service, tvShowService);

const port = 50052;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), 
  async (err, port) => {
    if (err) {
      console.error('Échec de la liaison du serveur:', err);
      process.exit(1);
    }
    
    await startKafkaConsumer().catch(console.error);
    server.start();
    console.log(`Microservice de séries TV opérationnel sur le port ${port}`);
    
  
    try {
      const db = await connectDB();
      await db.createIndex({ title: 'text', description: 'text' });
      console.log('Index MongoDB créés');
    } catch (err) {
      console.error('Erreur d\'initialisation DB:', err);
    }
  }
);