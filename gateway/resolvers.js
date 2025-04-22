const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const grpcOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};


const movieProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(__dirname, '../proto/movie.proto'), grpcOptions)
).movie;

const tvShowProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(__dirname, '../proto/tvShow.proto'), grpcOptions)
).tvShow;


const movieClient = new movieProto.MovieService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

const tvShowClient = new tvShowProto.TVShowService(
  'localhost:50052',
  grpc.credentials.createInsecure()
);


function grpcCall(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) {
        console.error(`gRPC error in ${method}:`, err);
        reject(new Error(err.details || 'Service unavailable'));
      } else {
        resolve(response);
      }
    });
  });
}

const resolvers = {
  Query: {
    
    movie: async (_, { id }) => {
      const response = await grpcCall(movieClient, 'getMovie', { movie_id: id });
      return response.movie;
    },
    

    movies: async () => {
      const response = await grpcCall(movieClient, 'searchMovies', { query: '' });
      return response.movies;
    },
    
   
    tvShow: async (_, { id }) => {
      const response = await grpcCall(tvShowClient, 'getTvshow', { tv_show_id: id });
      return response.tv_show;
    },
    

    tvShows: async () => {
      const response = await grpcCall(tvShowClient, 'searchTvshows', { query: '' });
      return response.tv_shows;
    }
  }
};
module.exports = resolvers;