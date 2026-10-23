import { WebSocket } from 'ws';
import { VolatilePriceEngine } from './price-engine';
import { OrderEngine } from './order-engine';
import { OrderSide, PlayerState, ServerMessage, StockTick } from './types';
import { STOCK_DEFINITIONS } from './stock-universe';

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
  public priceEngines: Map<string, VolatilePriceEngine> = new Map();
  public watchedTickerA: string = 'NVXP';
  public watchedTickerB: string = 'NVXP';

  public durationSeconds: number = 60;
  public timeLeft: number = 60;
  public get timeRemaining(): number {
    return this.timeLeft;
  }
  public set timeRemaining(val: number) {
    this.timeLeft = val;
  }
  public state: 'countdown' | 'in_progress' | 'ended' = 'countdown';

  private tickTimer?: NodeJS.Timeout;
  private clockTimer?: NodeJS.Timeout;
  private countdownTimer?: NodeJS.Timeout;
  private batchCounter: number = 0;
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

    // Initialize all 100 stocks with their unique logic and parameters
    for (const def of STOCK_DEFINITIONS) {
      this.priceEngines.set(
        def.ticker,
        new VolatilePriceEngine(def.ticker, def.name, def.price, def.volatility, def.sector)
      );
    }

    if (!this.priceEngines.has(symbol)) {
      this.priceEngines.set(symbol, new VolatilePriceEngine(symbol, 'NovaX AI Tech', 85.00));
    }

    this.priceEngine = this.priceEngines.get(symbol)!;
    this.watchedTickerA = symbol;
    this.watchedTickerB = symbol;

    this.stateA = OrderEngine.createPlayerState(playerA.id, playerA.nickname, playerA.title, playerA.animation);
    this.stateB = OrderEngine.createPlayerState(playerB.id, playerB.nickname, playerB.title, playerB.animation);
  }

  public setOnMatchEnd(cb: (room: MatchRoom, winnerId: string | 'tie', reason: string) => void) {
    this.onMatchEndCallback = cb;
  }

  public handleWatchTicker(playerId: string, ticker: string): void {
    const pe = this.priceEngines.get(ticker);
    if (!pe) return;

    const isPlayerA = playerId === this.playerA.id;
    if (isPlayerA) {
      this.watchedTickerA = ticker;
    } else {
      this.watchedTickerB = ticker;
    }

    const participant = isPlayerA ? this.playerA : this.playerB;
    this._sendTo(participant, {
      type: 'stock_data',
      roomId: this.id,
      ticker: pe.ticker,
      price: pe.price,
      change: pe.change,
      changePct: pe.changePct,
      candles: pe.candles,
      currentCandle: pe.currentCandle
    });
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

    // Broadcast match_start with initial candles
    this._sendTo(this.playerA, {
      type: 'match_start',
      roomId: this.id,
      opponent: { nickname: this.playerB.nickname, title: this.playerB.title, animation: this.playerB.animation },
      symbol: this.priceEngine.ticker,
      initialPrice: this.priceEngine.price,
      matchDuration: this.durationSeconds,
      candles: this.priceEngine.candles,
      currentCandle: this.priceEngine.currentCandle
    });

    this._sendTo(this.playerB, {
      type: 'match_start',
      roomId: this.id,
      opponent: { nickname: this.playerA.nickname, title: this.playerA.title, animation: this.playerA.animation },
      symbol: this.priceEngine.ticker,
      initialPrice: this.priceEngine.price,
      matchDuration: this.durationSeconds,
      candles: this.priceEngine.candles,
      currentCandle: this.priceEngine.currentCandle
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
    // 1. Advance all 100 stocks with their own unique Merton Jump Diffusion logic
    const ticks: Map<string, StockTick> = new Map();
    for (const [t, pe] of this.priceEngines.entries()) {
      ticks.set(t, pe.tick(0.1));
    }

    // 2. If player B is simulated bot, execute bot trading decisions
    if (this.playerB.isBot) {
      const botStock = this.priceEngines.get(this.watchedTickerB) || this.priceEngine;
      this._simulateBotAction(botStock.price, botStock.ticker);
    }

    // 3. Update player portfolios based on the exact stock they currently hold
    const posA = this.stateA.position;
    const priceA = posA ? (this.priceEngines.get(posA.ticker)?.price ?? this.priceEngine.price) : this.priceEngine.price;
    OrderEngine.updatePortfolio(this.stateA, priceA);

    const posB = this.stateB.position;
    const priceB = posB ? (this.priceEngines.get(posB.ticker)?.price ?? this.priceEngine.price) : this.priceEngine.price;
    OrderEngine.updatePortfolio(this.stateB, priceB);

    // 4. Check for liquidations
    if (this.stateA.status === 'liquidated') {
      this.concludeMatch('liquidation_a');
      return;
    }
    if (this.stateB.status === 'liquidated') {
      this.concludeMatch('liquidation_b');
      return;
    }

    // 5. Broadcast targeted high-frequency 10 Hz market ticks to each player for their watched stock
    const tickA = ticks.get(this.watchedTickerA) || ticks.get(this.priceEngine.ticker)!;
    this._sendTo(this.playerA, {
      type: 'market_tick',
      roomId: this.id,
      ticker: tickA.ticker,
      price: tickA.price,
      change: tickA.change,
      changePct: tickA.changePct,
      candle: tickA.candle,
      timestamp: tickA.timestamp
    });

    const tickB = ticks.get(this.watchedTickerB) || ticks.get(this.priceEngine.ticker)!;
    this._sendTo(this.playerB, {
      type: 'market_tick',
      roomId: this.id,
      ticker: tickB.ticker,
      price: tickB.price,
      change: tickB.change,
      changePct: tickB.changePct,
      candle: tickB.candle,
      timestamp: tickB.timestamp
    });

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

    // 7. Every 3 ticks (300ms), broadcast batch scanner prices for all 100 stocks
    this.batchCounter++;
    if (this.batchCounter % 3 === 0) {
      const summary: Record<string, { price: number; change: number; changePct: number }> = {};
      for (const [ticker, pe] of this.priceEngines.entries()) {
        summary[ticker] = {
          price: pe.price,
          change: pe.change,
          changePct: pe.changePct
        };
      }
      this._broadcast({
        type: 'market_batch',
        roomId: this.id,
        timestamp: Math.floor(Date.now() / 1000),
        stocks: summary
      });
    }
  }

  private _simulateBotAction(price: number, ticker: string = this.priceEngine.ticker) {
    // 5% chance per tick to take action
    if (Math.random() < 0.06) {
      const rand = Math.random();
      if (!this.stateB.position || this.stateB.position.shares === 0) {
        // Enter trade with 2x-5x leverage
        const side: OrderSide = rand > 0.48 ? 'BUY' : 'SHORT';
        const shares = Math.floor(20 + Math.random() * 80);
        const lev = Math.random() > 0.5 ? 5 : 2;
        OrderEngine.executeOrder(this.stateB, side, ticker, shares, price, lev);
      } else {
        // Manage active position
        const pnl = this.stateB.position.unrealizedPnL;
        const posTicker = this.stateB.position.ticker;
        const curPrice = this.priceEngines.get(posTicker)?.price ?? price;
        if (pnl > 300 || pnl < -400 || rand < 0.2) {
          OrderEngine.executeOrder(this.stateB, 'FLATTEN', posTicker, 0, curPrice);
        } else if (rand < 0.1) {
          OrderEngine.executeOrder(this.stateB, 'REVERSE', posTicker, 0, curPrice);
        }
      }
    }
  }

  public handleOrder(playerId: string, side: OrderSide, ticker: string, qty: number, leverage: number = 1): void {
    if (this.state !== 'in_progress') return;

    const isPlayerA = playerId === this.playerA.id;
    const player = isPlayerA ? this.stateA : this.stateB;
    const participant = isPlayerA ? this.playerA : this.playerB;

    const targetEngine = this.priceEngines.get(ticker) || this.priceEngine;
    const curPrice = targetEngine.price;

    const res = OrderEngine.executeOrder(player, side, ticker, qty, curPrice, leverage);

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
