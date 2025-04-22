const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { MongoClient } = require('mongodb');
const { Kafka } = require('kafkajs');


const movieProtoPath = path.join(__dirname, '../../proto/movie.proto');
const movieProtoDefinition = protoLoader.loadSync(movieProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const movieProto = grpc.loadPackageDefinition(movieProtoDefinition).movie;


const mongoUri = 'mongodb://localhost:27017';
const dbName = 'movie_service';
const collectionName = 'movies';

async function connectDB() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  return client.db(dbName).collection(collectionName);
}


const kafka = new Kafka({
  clientId: 'movie-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function sendKafkaEvent(eventType, movie) {
  await producer.connect();
  await producer.send({
    topic: 'movies_topic',
    messages: [{
      value: JSON.stringify({
        event_type: eventType,
        movie,
        timestamp: new Date().toISOString(),
        service: 'movie-service'
      })
    }]
  });
  await producer.disconnect();
}


const movieService = {
  getMovie: async (call, callback) => {
    try {
      const db = await connectDB();
      const movie = await db.findOne({ _id: call.request.movie_id });
      
      if (movie) {
        callback(null, { movie });
      } else {
        callback({
          code: grpc.status.NOT_FOUND,
          details: 'Movie not found'
        });
      }
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        details: err.message
      });
    }
  },

  searchMovies: async (call, callback) => {
    try {
      const db = await connectDB();
      const query = call.request.query || '';
      const filter = query ? { 
        $text: { $search: query } 
      } : {};
      
      const movies = await db.find(filter).toArray();
      callback(null, { movies });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        details: err.message
      });
    }
  },

  createMovie: async (call, callback) => {
    try {
      const db = await connectDB();
      const movieData = {
        ...call.request,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = await db.insertOne(movieData);
      const createdMovie = {
        id: result.insertedId,
        ...movieData
      };
      
      await sendKafkaEvent('MOVIE_CREATED', createdMovie);
      callback(null, { movie: createdMovie });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        details: err.message
      });
    }
  },

  updateMovie: async (call, callback) => {
    try {
      const db = await connectDB();
      const updateData = {
        ...call.request,
        updated_at: new Date().toISOString()
      };
      
      const result = await db.findOneAndUpdate(
        { _id: call.request.movie_id },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      await sendKafkaEvent('MOVIE_UPDATED', result.value);
      callback(null, { movie: result.value });
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        details: err.message
      });
    }
  },

  deleteMovie: async (call, callback) => {
    try {
      const db = await connectDB();
      const movie = await db.findOne({ _id: call.request.movie_id });
      
      if (!movie) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: 'Movie not found'
        });
      }
      
      await db.deleteOne({ _id: call.request.movie_id });
      await sendKafkaEvent('MOVIE_DELETED', movie);
      
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
  const consumer = kafka.consumer({ groupId: 'movie-service-group' });
  
  await consumer.connect();
  await consumer.subscribe({ 
    topics: ['tvshows_topic', 'movies_topic'],
    fromBeginning: true 
  });
  
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const event = JSON.parse(message.value.toString());
      console.log(`[${topic}] ${event.event_type}:`, event.movie || event.tvshow);
      if (topic === 'tvshows_topic' && event.event_type === 'TVSHOW_DELETED') {
        console.log('Une série liée a été supprimée, vérifier les films associés');
      }
    },
  });
}


const server = new grpc.Server();
server.addService(movieProto.MovieService.service, movieService);

const port = 50051;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), 
  async (err, port) => {
    if (err) {
      console.error('Échec de la liaison du serveur:', err);
      process.exit(1);
    }
    
    await startKafkaConsumer().catch(console.error);
    server.start();
    console.log(`Microservice de films opérationnel sur le port ${port}`);

    
    try {
      const db = await connectDB();
      await db.createIndex({ title: 'text', description: 'text' });
      console.log('Index MongoDB créés');
    } catch (err) {
      console.error('Erreur d\'initialisation DB:', err);
    }
  }
);