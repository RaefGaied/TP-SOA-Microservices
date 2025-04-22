const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const { Kafka, logLevel } = require('kafkajs');
const KAFKA_BROKERS = ['localhost:29092']
const MONGODB_URI = 'mongodb://localhost:27017';
const MOVIE_PROTO_PATH = path.join(__dirname, './proto/movie.proto');


const kafka = new Kafka({
  clientId: 'movie-service',
  brokers: KAFKA_BROKERS,
  connectionTimeout: 10000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 300,
    retries: 10,
    maxRetryTime: 10000,
    restartOnFailure: async (err) => {
      console.error('Kafka connection failed, will retry...', err);
      return true;
    }
  },
  logLevel: logLevel.ERROR
});

const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: 'movie-service-group',
  heartbeatInterval: 3000,
  sessionTimeout: 30000,
  maxWaitTimeInMs: 5000
});


let isProducerConnected = false;
let isConsumerRunning = false;


async function sendKafkaEvent(eventType, movie) {
  try {
    if (!isProducerConnected) {
      await producer.connect();
      isProducerConnected = true;
    }

    await producer.send({
      topic: 'movies_topic',
      messages: [{
        value: JSON.stringify({
          event_id: new ObjectId().toString(),
          event_type: eventType,
          timestamp: new Date().toISOString(),
          payload: movie,
          metadata: {
            service: 'movie-service'
          }
        })
      }]
    });
    
    console.log(`[Kafka] Successfully published ${eventType} event`);
  } catch (err) {
    console.error(`[Kafka] Error publishing ${eventType} event:`, err);
    isProducerConnected = false;
    throw err;
  }
}


async function startKafkaConsumer() {
  if (isConsumerRunning) return;

  const maxRetries = 5;
  let retryCount = 0;

  const connectWithRetry = async () => {
    try {
      console.log(`[Kafka] Connecting consumer (attempt ${retryCount + 1})`);
      
      await consumer.connect();
      await consumer.subscribe({
        topics: ['movies_topic', 'tvshows_topic'],
        fromBeginning: true
      });

      await consumer.run({
        autoCommit: true,
        eachMessage: async ({ topic, message }) => {
          try {
            const event = JSON.parse(message.value.toString());
            console.log(`[Kafka] Received ${event.event_type} from ${topic}`);

            if (topic === 'tvshows_topic' && event.event_type === 'TVSHOW_DELETED') {
              console.log('TV Show deleted, checking related movies...');
            }
          } catch (err) {
            console.error('[Kafka] Error processing message:', err);
          }
        }
      });

      isConsumerRunning = true;
      console.log('[Kafka] Consumer successfully connected');
    } catch (err) {
      retryCount++;
      
      if (retryCount >= maxRetries) {
        console.error('[Kafka] Max retries reached, giving up:', err);
        throw err;
      }

      console.error(`[Kafka] Connection failed, retrying in 5s... (${retryCount}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      await connectWithRetry();
    }
  };

  await connectWithRetry();
}


let mongoClient;
async function connectDB() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    });
    await mongoClient.connect();
  }
  return mongoClient.db('movie_service').collection('movies');
}


const movieService = {
    getMovie: async (call, callback) => {
        try {
          const db = await connectDB();
          const movie = await db.findOne({ _id: new ObjectId(call.request.movie_id) });
    
          if (!movie) {
            return callback({
              code: grpc.status.NOT_FOUND,
              details: 'Movie not found',
            });
          }
    
          callback(null, { movie });
        } catch (err) {
          callback({
            code: grpc.status.INTERNAL,
            details: err.message,
          });
        }
      },
    
      searchMovies: async (call, callback) => {
        try {
          const db = await connectDB();
          const query = call.request.query || '';
          const filter = query ? { $text: { $search: query } } : {};
          const movies = await db.find(filter).toArray();
    
          callback(null, { movies });
        } catch (err) {
          callback({
            code: grpc.status.INTERNAL,
            details: err.message,
          });
        }
      },
    
      createMovie: async (call, callback) => {
        try {
          const db = await connectDB();
          const movieData = {
            ...call.request,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
    
          const result = await db.insertOne(movieData);
          const createdMovie = {
            id: result.insertedId.toString(),
            ...movieData,
          };
    
          await sendKafkaEvent('MOVIE_CREATED', createdMovie);
          callback(null, { movie: createdMovie });
        } catch (err) {
          callback({
            code: grpc.status.INTERNAL,
            details: err.message,
          });
        }
      },
    
      updateMovie: async (call, callback) => {
        try {
          const db = await connectDB();
          const updateData = {
            ...call.request,
            updated_at: new Date().toISOString(),
          };
    
          const result = await db.findOneAndUpdate(
            { _id: new ObjectId(call.request.movie_id) },
            { $set: updateData },
            { returnDocument: 'after' }
          );
    
          if (!result.value) {
            return callback({
              code: grpc.status.NOT_FOUND,
              details: 'Movie not found',
            });
          }
    
          await sendKafkaEvent('MOVIE_UPDATED', result.value);
          callback(null, { movie: result.value });
        } catch (err) {
          callback({
            code: grpc.status.INTERNAL,
            details: err.message,
          });
        }
      },
    
      deleteMovie: async (call, callback) => {
        try {
          const db = await connectDB();
          const movie = await db.findOne({ _id: new ObjectId(call.request.movie_id) });
    
          if (!movie) {
            return callback({
              code: grpc.status.NOT_FOUND,
              details: 'Movie not found',
            });
          }
          await db.deleteOne({ _id: new ObjectId(call.request.movie_id) });
          await sendKafkaEvent('MOVIE_DELETED', movie);
    
          callback(null, { success: true });
        } catch (err) {
          callback({
            code: grpc.status.INTERNAL,
            details: err.message,
          });
        }
      },
    
};


async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  
  try {
 
    if (isProducerConnected) {
      await producer.disconnect().catch(console.error);
    }
    if (isConsumerRunning) {
      await consumer.disconnect().catch(console.error);
    }
    
    if (mongoClient) {
      await mongoClient.close().catch(console.error);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);


const movieProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(MOVIE_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })
).movie;

const server = new grpc.Server();
server.addService(movieProto.MovieService.service, movieService);

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), async (err, port) => {
  if (err) {
    console.error('Failed to bind server:', err);
    process.exit(1);
  }

  console.log(`🎬 Movie Microservice running on port ${port}`);

  try {
   
    const db = await connectDB();
    await db.createIndex({ title: 'text', description: 'text' });
    console.log('✅ MongoDB indexes created');
    
    await startKafkaConsumer();
  } catch (err) {
    console.error('❌ Startup error:', err);
    gracefulShutdown();
  }
});
