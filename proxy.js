const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const WebSocket = require('ws');
const path = require('path');


const PROTO_PATH = path.join(__dirname, 'chat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;


function createGrpcClient() {
  return new chatProto.ChatService('localhost:50051', grpc.credentials.createInsecure());
}


const wss = new WebSocket.Server({ port: 8080 });
console.log('✅ Reverse proxy WebSocket en écoute sur ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('📡 Nouveau client WebSocket connecté.');
  const grpcClient = createGrpcClient();
  const grpcStream = grpcClient.Chat();

  
  grpcStream.on('data', (chatStreamMessage) => {
    console.log('📩 Message reçu du serveur gRPC:', chatStreamMessage);
    ws.send(JSON.stringify(chatStreamMessage));
  });

  grpcStream.on('error', (err) => {
    console.error('❌ Erreur dans le stream gRPC:', err);
    ws.send(JSON.stringify({ error: err.message }));
  });

  grpcStream.on('end', () => {
    console.log('🛑 Stream gRPC terminé.');
    ws.close();
  });

  
  ws.on('message', (message) => {
    console.log('📥 Message reçu du client WebSocket:', message);
    try {
      const parsed = JSON.parse(message);
      if (parsed.chat_message) {
        grpcStream.write(parsed);
      } else if (parsed.type === "history" && parsed.room_id) {
        console.log(`📜 Demande d'historique pour la salle : ${parsed.room_id}`);
        grpcClient.GetChatHistory({ room_id: parsed.room_id }, (err, response) => {
          if (err) {
            console.error('❌ Erreur lors de la récupération de l\'historique:', err);
            ws.send(JSON.stringify({ error: err.message }));
          } else {
            console.log('📜 Historique récupéré:', response.messages);
            ws.send(JSON.stringify({
              type: "history",
              room_id: parsed.room_id,
              messages: response.messages
            }));
          }
        });
      } else {
        console.warn('⚠️ Type de message non reconnu');
        ws.send(JSON.stringify({ error: 'Type de message non reconnu' }));
      }

    } catch (err) {
      console.error('❌ Erreur lors de la conversion du message JSON:', err);
      ws.send(JSON.stringify({ error: 'Format JSON invalide' }));
    }
  });

  ws.on('close', () => {
    console.log('🚪 Client WebSocket déconnecté, fermeture du stream gRPC.');
    grpcStream.end();
  });
});
