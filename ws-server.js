const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

wss.on('connection', ws => {
    clients.add(ws);
    console.log("Nouvelle connexion WebSocket");

    ws.on('message', message => {
        console.log("Message reçu :", message);
        clients.forEach(client => client.send(message));
    });

    ws.on('close', () => clients.delete(ws));
});

console.log("Serveur WebSocket démarré sur ws://localhost:8080");
