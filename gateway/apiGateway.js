const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const bodyParser = require('body-parser');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { Kafka, logLevel } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');


const CONFIG = {
  KAFKA: {
    BROKERS: ['localhost:29092'],
    CLIENT_ID: 'api-gateway',
    TOPICS: {
      MOVIES: 'movies_topic',
      TV_SHOWS: 'tvshows_topic',
      ERRORS: {
        MOVIES: 'movies_error_topic',
        TV_SHOWS: 'tvshows_error_topic'
      }
    },
    CONSUMER_GROUP: 'api-gateway-consumer'
  },
  GRPC: {
    MOVIE_SERVICE: 'localhost:50051',
    TVSHOW_SERVICE: 'localhost:50052'
  },
  SERVER: {
    PORT: process.env.PORT || 3000,
    GRAPHQL_PATH: '/graphql',
    HEALTH_CHECK_PATH: '/health'
  },
  CACHE: {
    DEFAULT_TTL: 3600 
  },
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, 
    MAX_REQUESTS: 100
  }
};


class MemoryCache {
  constructor() {
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expireAt && entry.expireAt < Date.now()) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttl = CONFIG.CACHE.DEFAULT_TTL) {
    const entry = {
      value,
      expireAt: ttl ? Date.now() + ttl * 1000 : 0
    };
    this.store.set(key, entry);
    this.stats.sets++;
  }

  delete(key) {
    const existed = this.store.delete(key);
    if (existed) this.stats.deletes++;
    return existed;
  }

  clear() {
    this.store.clear();
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.store.size,
      hitRate: total > 0 ? (this.stats.hits / total) : 0
    };
  }
}

const cache = new MemoryCache();


const kafka = new Kafka({
  clientId: CONFIG.KAFKA.CLIENT_ID,
  brokers: CONFIG.KAFKA.BROKERS,
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
  groupId: CONFIG.KAFKA.CONSUMER_GROUP,
  heartbeatInterval: 3000,
  sessionTimeout: 30000,
  maxWaitTimeInMs: 5000
});

let isProducerConnected = false;
let isConsumerRunning = false;

async function connectProducer() {
  if (!isProducerConnected) {
    try {
      await producer.connect();
      isProducerConnected = true;
      console.log('[Kafka] Producer connected');
    } catch (err) {
      console.error('[Kafka] Producer connection error:', err);
      isProducerConnected = false;
      throw err;
    }
  }
}

async function sendKafkaEvent(topic, eventType, payload) {
  try {
    await connectProducer();
    
    const message = {
      event_id: uuidv4(),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      payload,
      metadata: {
        service: CONFIG.KAFKA.CLIENT_ID,
        correlation_id: uuidv4()
      }
    };

    await producer.send({
      topic,
      messages: [{
        value: JSON.stringify(message),
        headers: {
          event_type: eventType,
          service: CONFIG.KAFKA.CLIENT_ID
        }
      }]
    });

    console.log(`[Kafka] Event ${eventType} published to ${topic}`);
  } catch (err) {
    console.error(`[Kafka] Error publishing to ${topic}:`, err);
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
      console.log(`[Kafka] Connecting consumer (attempt ${retryCount + 1}/${maxRetries})`);
      
      await consumer.connect();
      await consumer.subscribe({
        topics: [CONFIG.KAFKA.TOPICS.MOVIES, CONFIG.KAFKA.TOPICS.TV_SHOWS],
        fromBeginning: true
      });

      await consumer.run({
        autoCommit: true,
        eachMessage: async ({ topic, message }) => {
          try {
            const event = JSON.parse(message.value.toString());
            console.log(`[Kafka] Received ${event.event_type} from ${topic}`);
      
            if (topic === CONFIG.KAFKA.TOPICS.MOVIES && 
                event.event_type === 'MOVIE_CREATED') {
              cache.set(`movie:${event.payload.id}`, event.payload);
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


const movieProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(__dirname, '../proto/movie.proto'), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })
).movie;

const tvShowProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(__dirname, '../proto/tvShow.proto'), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })
).tvShow;

const grpcClients = {
  movie: new movieProto.MovieService(
    CONFIG.GRPC.MOVIE_SERVICE, 
    grpc.credentials.createInsecure()
  ),
  tvShow: new tvShowProto.TVShowService(
    CONFIG.GRPC.TVSHOW_SERVICE,
    grpc.credentials.createInsecure()
  )
};


const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(rateLimit({
  windowMs: CONFIG.RATE_LIMIT.WINDOW_MS,
  max: CONFIG.RATE_LIMIT.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later',
    status: 429
  },
  skip: (req) => req.path === CONFIG.SERVER.HEALTH_CHECK_PATH
}));


const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (err) => ({
    message: err.message,
    code: err.extensions?.code || 'INTERNAL_SERVER_ERROR'
  }),
  cache: 'bounded',
  persistedQueries: false
});


const handleGrpcError = (res, err) => {
  console.error('gRPC error:', err);
  res.status(err.code || grpc.status.INTERNAL).json({ 
    error: err.message,
    code: err.code || grpc.status.INTERNAL
  });
};


app.get('/movies', async (req, res) => {
  try {
    const cacheKey = `movies:${req.query.query || 'all'}`;
    const cached = cache.get(cacheKey);
    
    if (cached) return res.json(cached);

    grpcClients.movie.searchMovies({ query: req.query.query || '' }, (err, response) => {
      if (err) return handleGrpcError(res, err);
      cache.set(cacheKey, response.movies, 60); // Cache for 1 minute
      res.json(response.movies);
    });
  } catch (err) {
    handleGrpcError(res, err);
  }
});

app.get('/movies/:id', async (req, res) => {
  try {
    const cached = cache.get(`movie:${req.params.id}`);
    if (cached) return res.json(cached);

    grpcClients.movie.getMovie({ movie_id: req.params.id }, (err, response) => {
      if (err) return handleGrpcError(res, err);
      cache.set(`movie:${req.params.id}`, response.movie);
      res.json(response.movie);
    });
  } catch (err) {
    handleGrpcError(res, err);
  }
});

app.post('/movies', async (req, res) => {
  try {
    const movieData = req.body;
    await sendKafkaEvent(CONFIG.KAFKA.TOPICS.MOVIES, 'MOVIE_CREATION_STARTED', movieData);
    
    grpcClients.movie.createMovie(movieData, async (err, response) => {
      if (err) {
        await sendKafkaEvent(
          CONFIG.KAFKA.TOPICS.ERRORS.MOVIES, 
          'MOVIE_CREATION_FAILED', 
          { error: err.message, data: movieData }
        );
        return handleGrpcError(res, err);
      }

      await sendKafkaEvent(CONFIG.KAFKA.TOPICS.MOVIES, 'MOVIE_CREATED', response.movie);
      cache.set(`movie:${response.movie.id}`, response.movie);
      res.status(201).json(response.movie);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/tvshows', (req, res) => {
  grpcClients.tvShow.searchTvshows({ query: req.query.query || '' }, (err, response) => 
    err ? handleGrpcError(res, err) : res.json(response.tv_shows)
  );
});

app.get('/tvshows/:id', (req, res) => {
  grpcClients.tvShow.getTvshow({ tv_show_id: req.params.id }, (err, response) => {
    err ? handleGrpcError(res, err) : res.json(response.tv_show)
  });
});

app.post('/tvshows', async (req, res) => {
  try {
    const tvShowData = req.body;
    await sendKafkaEvent(CONFIG.KAFKA.TOPICS.TV_SHOWS, 'TVSHOW_CREATION_STARTED', tvShowData);
    
    grpcClients.tvShow.createTvshow(tvShowData, async (err, response) => {
      if (err) {
        await sendKafkaEvent(
          CONFIG.KAFKA.TOPICS.ERRORS.TV_SHOWS, 
          'TVSHOW_CREATION_FAILED', 
          { error: err.message, data: tvShowData }
        );
        return handleGrpcError(res, err);
      }

      await sendKafkaEvent(CONFIG.KAFKA.TOPICS.TV_SHOWS, 'TVSHOW_CREATED', response.tv_show);
      res.status(201).json(response.tv_show);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(CONFIG.SERVER.HEALTH_CHECK_PATH, async (req, res) => {
  const checkService = (client) => new Promise(resolve => {
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 2);
    client.waitForReady(deadline, err => resolve(!err));
  });

  const checkKafka = async () => {
    try {
      if (!isProducerConnected) await connectProducer();
      return true;
    } catch {
      return false;
    }
  };

  const [movieStatus, tvShowStatus, kafkaStatus] = await Promise.all([
    checkService(grpcClients.movie),
    checkService(grpcClients.tvShow),
    checkKafka()
  ]);

  res.status(movieStatus && tvShowStatus && kafkaStatus ? 200 : 503).json({
    services: {
      movie: movieStatus ? 'healthy' : 'unavailable',
      tvShow: tvShowStatus ? 'healthy' : 'unavailable',
      kafka: kafkaStatus ? 'healthy' : 'unavailable'
    },
    cache: cache.getStats(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});


async function gracefulShutdown() {
  console.log('Starting graceful shutdown...');
  
  try {
  
    if (isProducerConnected) {
      await producer.disconnect().catch(console.error);
    }
    if (isConsumerRunning) {
      await consumer.disconnect().catch(console.error);
    }
    
   
    await server.stop();
    console.log('Server gracefully stopped');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);


async function startServer() {
  try {
    await server.start();
    
   
    startKafkaConsumer().catch(err => {
      console.error('Failed to start Kafka consumer:', err);
    });

 
    app.post(CONFIG.SERVER.GRAPHQL_PATH, 
      bodyParser.json(),
      expressMiddleware(server, {
        context: async ({ req }) => ({
          movieClient: grpcClients.movie,
          tvShowClient: grpcClients.tvShow,
          auth: req.headers?.authorization,
          cache
        })
      })
    );

    app.get(CONFIG.SERVER.GRAPHQL_PATH, (req, res) => {
      res.redirect(302, `https://studio.apollographql.com/sandbox/explorer?endpoint=http://localhost:${CONFIG.SERVER.PORT}${CONFIG.SERVER.GRAPHQL_PATH}`);
    });


    app.listen(CONFIG.SERVER.PORT, () => {
      console.log(`
🚀 API Gateway running on http://localhost:${CONFIG.SERVER.PORT}

Services:
  - GraphQL: ${CONFIG.SERVER.GRAPHQL_PATH}
  - REST API: /movies, /tvshows
  - Health: ${CONFIG.SERVER.HEALTH_CHECK_PATH}

Connections:
  - gRPC Movie: ${CONFIG.GRPC.MOVIE_SERVICE}
  - gRPC TV Show: ${CONFIG.GRPC.TVSHOW_SERVICE}
  - Kafka: ${CONFIG.KAFKA.BROKERS.join(', ')}

Environment: ${process.env.NODE_ENV || 'development'}
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();