export type OrderSide = 'BUY' | 'SELL' | 'SHORT' | 'COVER' | 'REVERSE' | 'FLATTEN';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockTick {
  ticker: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePct: number;
  timestamp: number;
  candle: CandleData;
}

export interface PositionState {
  ticker: string;
  shares: number; // positive for LONG, negative for SHORT
  avgEntry: number;
  leverage: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  marginUsed: number;
}

export interface PlayerState {
  id: string;
  nickname: string;
  equippedTitle: string;
  equippedAnimation: string;
  cash: number;
  equity: number;
  initialCash: number;
  buyingPower: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  totalPnLPct: number;
  position: PositionState | null;
  status: 'playing' | 'forfeited' | 'liquidated';
}

export interface OpponentSummary {
  id: string;
  nickname: string;
  equippedTitle: string;
  equippedAnimation: string;
  equity: number;
  totalPnL: number;
  totalPnLPct: number;
  positionShares: number;
  status: 'playing' | 'forfeited' | 'liquidated';
}

export interface BatchStockSummary {
  price: number;
  change: number;
  changePct: number;
}

export type ClientMessage =
  | { type: 'join_queue'; nickname: string; equippedTitle?: string; equippedAnimation?: string; duration?: number }
  | { type: 'cancel_queue' }
  | { type: 'order'; side: OrderSide; ticker: string; qty: number; leverage?: number }
  | { type: 'next_opponent'; duration?: number }
  | { type: 'leave_match' }
  | { type: 'watch_ticker'; ticker: string }
  | { type: 'ping'; timestamp: number };

export type ServerMessage =
  | { type: 'queue_status'; position: number; queueLength: number; status: string }
  | { type: 'match_countdown'; roomId: string; countdown: number; opponent: { nickname: string; title: string }; matchDuration: number; symbol: string }
  | { type: 'match_start'; roomId: string; opponent: { nickname: string; title: string; animation: string }; symbol: string; initialPrice: number; matchDuration: number; candles?: CandleData[]; currentCandle?: CandleData }
  | { type: 'market_tick'; roomId: string; ticker: string; price: number; change: number; changePct: number; candle: CandleData; timestamp: number }
  | { type: 'market_batch'; roomId: string; timestamp: number; stocks: Record<string, BatchStockSummary> }
  | { type: 'stock_data'; roomId: string; ticker: string; price: number; change: number; changePct: number; candles: CandleData[]; currentCandle: CandleData }
  | { type: 'order_ack'; orderId: string; success: boolean; side: OrderSide; shares: number; price: number; leverage: number; message: string }
  | { type: 'portfolio_update'; roomId: string; you: PlayerState; opponent: OpponentSummary; timeLeft: number; leadDiff: number }
  | { type: 'match_end'; roomId: string; winner: 'you' | 'opponent' | 'tie'; reason: string; yourFinalEquity: number; oppFinalEquity: number; netProfitDiff: number }
  | { type: 'pong'; timestamp: number };
