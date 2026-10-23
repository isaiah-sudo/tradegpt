import { WebSocket } from 'ws';
import { VolatilePriceEngine } from './price-engine';
import { OrderEngine } from './order-engine';
import { OrderSide, PlayerState, ServerMessage } from './types';

export interface RoomParticipant {
  id: string;
  ws?: WebSocket;
  nickname: string;
  title: string;
  animation: string;
  isBot?: boolean;
}

export class MatchRoom {
  public id: string;
  public playerA: RoomParticipant;
  public playerB: RoomParticipant;
  public stateA: PlayerState;
  public stateB: PlayerState;

  public priceEngine: VolatilePriceEngine;
  public durationSeconds: number = 60;
  public timeLeft: number = 60;
  public state: 'countdown' | 'in_progress' | 'ended' = 'countdown';

  private tickTimer?: NodeJS.Timeout;
  private clockTimer?: NodeJS.Timeout;
  private countdownTimer?: NodeJS.Timeout;
  private onMatchEndCallback?: (room: MatchRoom, winnerId: string | 'tie', reason: string) => void;

  constructor(
    id: string,
    playerA: RoomParticipant,
    playerB: RoomParticipant,
    symbol: string = 'NVXP',
    durationSeconds: number = 60
  ) {
    this.id = id;
    this.playerA = playerA;
    this.playerB = playerB;
    this.durationSeconds = durationSeconds;
    this.timeLeft = durationSeconds;

    this.priceEngine = new VolatilePriceEngine(symbol, 'NovaX AI Tech', 85.00);

    this.stateA = OrderEngine.createPlayerState(playerA.id, playerA.nickname, playerA.title, playerA.animation);
    this.stateB = OrderEngine.createPlayerState(playerB.id, playerB.nickname, playerB.title, playerB.animation);
  }

  public setOnMatchEnd(cb: (room: MatchRoom, winnerId: string | 'tie', reason: string) => void) {
    this.onMatchEndCallback = cb;
  }

  public startCountdown() {
    this.state = 'countdown';
    let count = 3;

    // Send initial countdown payload
    this._broadcastCountdown(count);

    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this._broadcastCountdown(count);
      } else {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.startMatch();
      }
    }, 1000);
  }

  private _broadcastCountdown(count: number) {
    this._sendTo(this.playerA, {
      type: 'match_countdown',
      roomId: this.id,
      countdown: count,
      opponent: { nickname: this.playerB.nickname, title: this.playerB.title },
      matchDuration: this.durationSeconds,
      symbol: this.priceEngine.ticker
    });

    this._sendTo(this.playerB, {
      type: 'match_countdown',
      roomId: this.id,
      countdown: count,
      opponent: { nickname: this.playerA.nickname, title: this.playerA.title },
      matchDuration: this.durationSeconds,
      symbol: this.priceEngine.ticker
    });
  }

  public startMatch() {
    this.state = 'in_progress';

    // Broadcast match_start
    this._sendTo(this.playerA, {
      type: 'match_start',
      roomId: this.id,
      opponent: { nickname: this.playerB.nickname, title: this.playerB.title, animation: this.playerB.animation },
      symbol: this.priceEngine.ticker,
      initialPrice: this.priceEngine.price,
      matchDuration: this.durationSeconds
    });

    this._sendTo(this.playerB, {
      type: 'match_start',
      roomId: this.id,
      opponent: { nickname: this.playerA.nickname, title: this.playerA.title, animation: this.playerA.animation },
      symbol: this.priceEngine.ticker,
      initialPrice: this.priceEngine.price,
      matchDuration: this.durationSeconds
    });

    // 10 Hz Market Ticks & PnL Sync Engine (100ms updates)
    this.tickTimer = setInterval(() => {
      if (this.state !== 'in_progress') return;
      this._onTick();
    }, 100);

    // 1-Second Authoritative Match Clock
    this.clockTimer = setInterval(() => {
      if (this.state !== 'in_progress') return;
      this.timeLeft--;

      if (this.timeLeft <= 0) {
        this.concludeMatch('time_expired');
      }
    }, 1000);
  }

  private _onTick() {
    // 1. Generate authoritative price tick via GBM Jump Diffusion
    const tick = this.priceEngine.tick(0.1);

    // 2. If player B is simulated bot, execute bot trading decisions
    if (this.playerB.isBot) {
      this._simulateBotAction(tick.price);
    }

    // 3. Update player portfolios and evaluate margin / liquidations
    OrderEngine.updatePortfolio(this.stateA, tick.price);
    OrderEngine.updatePortfolio(this.stateB, tick.price);

    // 4. Check for liquidations
    if (this.stateA.status === 'liquidated') {
      this.concludeMatch('liquidation_a');
      return;
    }
    if (this.stateB.status === 'liquidated') {
      this.concludeMatch('liquidation_b');
      return;
    }

    // 5. Broadcast market tick
    const tickMsg: ServerMessage = {
      type: 'market_tick',
      roomId: this.id,
      ticker: tick.ticker,
      price: tick.price,
      change: tick.change,
      changePct: tick.changePct,
      candle: tick.candle,
      timestamp: tick.timestamp
    };
    this._broadcast(tickMsg);

    // 6. Broadcast dual PnL updates
    const leadDiffA = Number((this.stateA.equity - this.stateB.equity).toFixed(2));
    this._sendTo(this.playerA, {
      type: 'portfolio_update',
      roomId: this.id,
      you: this.stateA,
      opponent: {
        id: this.playerB.id,
        nickname: this.playerB.nickname,
        equippedTitle: this.playerB.title,
        equippedAnimation: this.playerB.animation,
        equity: this.stateB.equity,
        totalPnL: this.stateB.totalPnL,
        totalPnLPct: this.stateB.totalPnLPct,
        positionShares: this.stateB.position ? this.stateB.position.shares : 0,
        status: this.stateB.status
      },
      timeLeft: this.timeLeft,
      leadDiff: leadDiffA
    });

    const leadDiffB = -leadDiffA;
    this._sendTo(this.playerB, {
      type: 'portfolio_update',
      roomId: this.id,
      you: this.stateB,
      opponent: {
        id: this.playerA.id,
        nickname: this.playerA.nickname,
        equippedTitle: this.playerA.title,
        equippedAnimation: this.playerA.animation,
        equity: this.stateA.equity,
        totalPnL: this.stateA.totalPnL,
        totalPnLPct: this.stateA.totalPnLPct,
        positionShares: this.stateA.position ? this.stateA.position.shares : 0,
        status: this.stateA.status
      },
      timeLeft: this.timeLeft,
      leadDiff: leadDiffB
    });
  }

  private _simulateBotAction(price: number) {
    // 5% chance per tick to take action
    if (Math.random() < 0.06) {
      const rand = Math.random();
      if (!this.stateB.position || this.stateB.position.shares === 0) {
        // Enter trade with 2x-5x leverage
        const side: OrderSide = rand > 0.48 ? 'BUY' : 'SHORT';
        const shares = Math.floor(20 + Math.random() * 80);
        const lev = Math.random() > 0.5 ? 5 : 2;
        OrderEngine.executeOrder(this.stateB, side, this.priceEngine.ticker, shares, price, lev);
      } else {
        // Manage active position
        const pnl = this.stateB.position.unrealizedPnL;
        if (pnl > 300 || pnl < -400 || rand < 0.2) {
          OrderEngine.executeOrder(this.stateB, 'FLATTEN', this.priceEngine.ticker, 0, price);
        } else if (rand < 0.1) {
          OrderEngine.executeOrder(this.stateB, 'REVERSE', this.priceEngine.ticker, 0, price);
        }
      }
    }
  }

  public handleOrder(playerId: string, side: OrderSide, ticker: string, qty: number, leverage: number = 1): void {
    if (this.state !== 'in_progress') return;

    const isPlayerA = playerId === this.playerA.id;
    const player = isPlayerA ? this.stateA : this.stateB;
    const participant = isPlayerA ? this.playerA : this.playerB;

    const res = OrderEngine.executeOrder(player, side, ticker, qty, this.priceEngine.price, leverage);

    this._sendTo(participant, {
      type: 'order_ack',
      orderId: `ord_${Date.now()}`,
      success: res.success,
      side,
      shares: res.executedShares,
      price: res.price,
      leverage,
      message: res.message
    });
  }

  public handleForfeit(playerId: string, reason: string = 'forfeited'): void {
    if (this.state === 'ended') return;

    if (playerId === this.playerA.id) {
      this.stateA.status = 'forfeited';
      this.concludeMatch('forfeit_a');
    } else {
      this.stateB.status = 'forfeited';
      this.concludeMatch('forfeit_b');
    }
  }

  public concludeMatch(reasonCode: string) {
    if (this.state === 'ended') return;
    this.state = 'ended';

    this.stopTimers();

    let winnerId: string | 'tie' = 'tie';
    let winnerA: 'you' | 'opponent' | 'tie' = 'tie';
    let winnerB: 'you' | 'opponent' | 'tie' = 'tie';
    let messageA = '';
    let messageB = '';

    if (reasonCode === 'forfeit_a') {
      winnerId = this.playerB.id;
      winnerA = 'opponent';
      winnerB = 'you';
      messageA = 'You forfeited the match.';
      messageB = `${this.playerA.nickname} disconnected or skipped.`;
    } else if (reasonCode === 'forfeit_b') {
      winnerId = this.playerA.id;
      winnerA = 'you';
      winnerB = 'opponent';
      messageA = `${this.playerB.nickname} disconnected or skipped.`;
      messageB = 'You forfeited the match.';
    } else if (reasonCode === 'liquidation_a') {
      winnerId = this.playerB.id;
      winnerA = 'opponent';
      winnerB = 'you';
      messageA = 'Margin Call! Your portfolio was liquidated.';
      messageB = `Victory! Opponent suffered a margin liquidation.`;
    } else if (reasonCode === 'liquidation_b') {
      winnerId = this.playerA.id;
      winnerA = 'you';
      winnerB = 'opponent';
      messageA = 'Victory! Opponent suffered a margin liquidation.';
      messageB = 'Margin Call! Your portfolio was liquidated.';
    } else {
      // Time expired
      const diff = this.stateA.equity - this.stateB.equity;
      if (Math.abs(diff) < 1.0) {
        winnerId = 'tie';
        winnerA = 'tie';
        winnerB = 'tie';
        messageA = 'Match Ended in a Tie!';
        messageB = 'Match Ended in a Tie!';
      } else if (diff > 0) {
        winnerId = this.playerA.id;
        winnerA = 'you';
        winnerB = 'opponent';
        messageA = `Victory! You beat ${this.playerB.nickname} by $${diff.toFixed(2)}`;
        messageB = `Defeat! ${this.playerA.nickname} beat you by $${diff.toFixed(2)}`;
      } else {
        winnerId = this.playerB.id;
        winnerA = 'opponent';
        winnerB = 'you';
        messageA = `Defeat! ${this.playerB.nickname} beat you by $${Math.abs(diff).toFixed(2)}`;
        messageB = `Victory! You beat ${this.playerA.nickname} by $${Math.abs(diff).toFixed(2)}`;
      }
    }

    const netProfitDiffA = Number((this.stateA.equity - this.stateB.equity).toFixed(2));

    this._sendTo(this.playerA, {
      type: 'match_end',
      roomId: this.id,
      winner: winnerA,
      reason: messageA,
      yourFinalEquity: this.stateA.equity,
      oppFinalEquity: this.stateB.equity,
      netProfitDiff: netProfitDiffA
    });

    this._sendTo(this.playerB, {
      type: 'match_end',
      roomId: this.id,
      winner: winnerB,
      reason: messageB,
      yourFinalEquity: this.stateB.equity,
      oppFinalEquity: this.stateA.equity,
      netProfitDiff: -netProfitDiffA
    });

    if (this.onMatchEndCallback) {
      this.onMatchEndCallback(this, winnerId, reasonCode);
    }
  }

  public stopTimers() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  private _broadcast(msg: ServerMessage) {
    this._sendTo(this.playerA, msg);
    this._sendTo(this.playerB, msg);
  }

  private _sendTo(participant: RoomParticipant, msg: ServerMessage) {
    if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
      try {
        participant.ws.send(JSON.stringify(msg));
      } catch (e) {
        // Socket send error
      }
    }
  }
}
