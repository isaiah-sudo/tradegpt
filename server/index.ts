import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { Matchmaker } from './matchmaker';
import { ClientMessage } from './types';

const app = express();
let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4002;

app.use(cors());
app.use(express.json());

// Serve static frontend files
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Route shortcuts
app.get('/play', (_req, res) => {
  res.sendFile(path.join(publicDir, 'play.html'));
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'TradeGPT 1v1 High-Frequency WebSocket Game Server'
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('error', (err) => {
  console.warn('WSS Warning:', err.message);
});

const matchmaker = new Matchmaker();

let socketSeq = 1;

wss.on('connection', (ws: WebSocket) => {
  const playerId = `p_${Date.now()}_${socketSeq++}`;
  let currentNickname = `Trader_${playerId.slice(-4)}`;

  ws.on('message', (data: Buffer | string) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      switch (msg.type) {
        case 'join_queue':
          currentNickname = msg.nickname || currentNickname;
          matchmaker.enqueue(playerId, ws, currentNickname, msg.equippedTitle, msg.equippedAnimation, msg.duration || 60);
          break;

        case 'cancel_queue':
          matchmaker.dequeue(playerId);
          break;

        case 'watch_ticker': {
          const room = matchmaker.getRoomForPlayer(playerId);
          if (room) {
            room.handleWatchTicker(playerId, msg.ticker);
          }
          break;
        }

        case 'order': {
          const room = matchmaker.getRoomForPlayer(playerId);
          if (room) {
            room.handleOrder(playerId, msg.side, msg.ticker, msg.qty, msg.leverage || 1);
          }
          break;
        }

        case 'next_opponent':
          // Omegle skip: immediately leave/forfeit active match and re-enqueue with same duration format
          matchmaker.enqueue(playerId, ws, currentNickname, undefined, undefined, msg.duration || 60);
          break;

        case 'leave_match':
          matchmaker.leaveOrSkip(playerId);
          break;

        case 'ping':
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong', timestamp: msg.timestamp }));
          }
          break;
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    matchmaker.handleDisconnect(playerId);
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error on player ${playerId}:`, err);
    matchmaker.handleDisconnect(playerId);
  });
});

function startServer(p: number) {
  server.listen(p, () => {
    console.log(`=======================================================`);
    console.log(`  TradeGPT Live 1v1 Game Server running on port ${p}`);
    console.log(`  Web Terminal: http://localhost:${p}/play`);
    console.log(`  WebSocket URL: ws://localhost:${p}/ws`);
    console.log(`=======================================================`);
  });
}

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${port} in use, trying port ${port + 1}...`);
    port++;
    startServer(port);
  } else {
    console.error('Server error:', err);
  }
});

startServer(port);

export { server, app, matchmaker };
