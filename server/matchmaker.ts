import { WebSocket } from 'ws';
import { MatchRoom, RoomParticipant } from './room';
import { ServerMessage } from './types';

interface QueuedPlayer {
  id: string;
  ws: WebSocket;
  nickname: string;
  title: string;
  animation: string;
  duration: number; // 60, 120, or 300
  joinedAt: number;
  botFallbackTimer?: NodeJS.Timeout;
}

export class Matchmaker {
  private queue: QueuedPlayer[] = [];
  private activeRooms: Map<string, MatchRoom> = new Map();
  private playerRoomMap: Map<string, string> = new Map(); // playerId -> roomId

  private static BOT_NAMES = [
    { name: "WallSt_Titan", title: "title_whale", anim: "golden_bull" },
    { name: "DiamondHands_99", title: "title_diamond", anim: "diamond_hands" },
    { name: "AlphaScalper", title: "title_quant", anim: "matrix_glitch" },
    { name: "BullishApe", title: "title_ape", anim: "rocket_moon" },
    { name: "QuantAlgo_X", title: "title_quant", anim: "matrix_glitch" },
    { name: "YOLO_God", title: "title_ape", anim: "money_rain" }
  ];

  public enqueue(
    id: string,
    ws: WebSocket,
    nickname: string,
    title: string = 'title_trader',
    animation: string = 'money_rain',
    duration: number = 60
  ): void {
    // If already in an active room, forfeit/leave it first (Omegle Next Opponent behavior)
    this.leaveOrSkip(id);

    // Remove if already in queue
    this.dequeue(id);

    const validDuration = [60, 120, 300].includes(duration) ? duration : 60;

    const player: QueuedPlayer = {
      id,
      ws,
      nickname: nickname || `Trader_${Math.floor(100 + Math.random() * 900)}`,
      title: title || 'title_trader',
      animation: animation || 'money_rain',
      duration: validDuration,
      joinedAt: Date.now()
    };

    // Set bot fallback timer: if no human joins within 3 seconds, pair with high-speed simulated rival bot
    player.botFallbackTimer = setTimeout(() => {
      this._pairWithBot(player.id);
    }, 3000);

    this.queue.push(player);

    const durLabel = validDuration === 60 ? '60s Blitz' : validDuration === 120 ? '2m Tactical' : '5m Marathon';

    this._send(ws, {
      type: 'queue_status',
      position: this.queue.length,
      queueLength: this.queue.length,
      status: `Searching for ${durLabel} opponent...`
    });

    this._tryMatchPair();
  }

  public dequeue(id: string): void {
    const idx = this.queue.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = this.queue[idx];
      if (p.botFallbackTimer) clearTimeout(p.botFallbackTimer);
      this.queue.splice(idx, 1);
    }
  }

  public leaveOrSkip(playerId: string): void {
    this.dequeue(playerId);

    const roomId = this.playerRoomMap.get(playerId);
    if (roomId) {
      const room = this.activeRooms.get(roomId);
      if (room) {
        room.handleForfeit(playerId, 'skipped');
      }
      this.playerRoomMap.delete(playerId);
    }
  }

  private _tryMatchPair(): void {
    for (let i = 0; i < this.queue.length; i++) {
      for (let j = i + 1; j < this.queue.length; j++) {
        if (this.queue[i].duration === this.queue[j].duration) {
          const p2 = this.queue.splice(j, 1)[0];
          const p1 = this.queue.splice(i, 1)[0];

          if (p1.botFallbackTimer) clearTimeout(p1.botFallbackTimer);
          if (p2.botFallbackTimer) clearTimeout(p2.botFallbackTimer);

          const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

          const participantA: RoomParticipant = {
            id: p1.id,
            ws: p1.ws,
            nickname: p1.nickname,
            title: p1.title,
            animation: p1.animation,
            isBot: false
          };

          const participantB: RoomParticipant = {
            id: p2.id,
            ws: p2.ws,
            nickname: p2.nickname,
            title: p2.title,
            animation: p2.animation,
            isBot: false
          };

          this._createAndLaunchRoom(roomId, participantA, participantB, p1.duration);
          return;
        }
      }
    }
  }

  private _pairWithBot(playerId: string): void {
    const idx = this.queue.findIndex(p => p.id === playerId);
    if (idx === -1) return;

    const p1 = this.queue.splice(idx, 1)[0];
    if (p1.botFallbackTimer) clearTimeout(p1.botFallbackTimer);

    const botTemplate = Matchmaker.BOT_NAMES[Math.floor(Math.random() * Matchmaker.BOT_NAMES.length)];
    const botId = `bot_${Date.now()}`;

    const participantA: RoomParticipant = {
      id: p1.id,
      ws: p1.ws,
      nickname: p1.nickname,
      title: p1.title,
      animation: p1.animation,
      isBot: false
    };

    const participantB: RoomParticipant = {
      id: botId,
      nickname: botTemplate.name,
      title: botTemplate.title,
      animation: botTemplate.anim,
      isBot: true
    };

    const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this._createAndLaunchRoom(roomId, participantA, participantB, p1.duration);
  }

  private _createAndLaunchRoom(roomId: string, pA: RoomParticipant, pB: RoomParticipant, duration: number = 60): void {
    const symbols = ['NVXP', 'TSLA', 'AAPL', 'COIN', 'MSFT', 'AMZN'];
    const chosenSymbol = symbols[Math.floor(Math.random() * symbols.length)];

    const room = new MatchRoom(roomId, pA, pB, chosenSymbol, duration);

    this.activeRooms.set(roomId, room);
    this.playerRoomMap.set(pA.id, roomId);
    this.playerRoomMap.set(pB.id, roomId);

    room.setOnMatchEnd((endedRoom) => {
      setTimeout(() => {
        this.activeRooms.delete(endedRoom.id);
        this.playerRoomMap.delete(endedRoom.playerA.id);
        this.playerRoomMap.delete(endedRoom.playerB.id);
      }, 5000);
    });

    room.startCountdown();
  }

  public getRoomForPlayer(playerId: string): MatchRoom | undefined {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return undefined;
    return this.activeRooms.get(roomId);
  }

  public handleDisconnect(playerId: string): void {
    this.leaveOrSkip(playerId);
  }

  private _send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
      } catch (e) {}
    }
  }
}
