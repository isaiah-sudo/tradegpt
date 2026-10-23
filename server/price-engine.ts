import { CandleData, StockTick } from './types';

export class VolatilePriceEngine {
  public ticker: string;
  public name: string;
  public sector: string;
  public price: number;
  public initialPrice: number;
  public prevClose: number;
  public volume: number = 0;
  public baseVolatility: number;

  // GBM parameters
  private mu: number = 0.0002;          // small drift
  private sigma: number = 0.045;        // high volatility for fast action
  private baseSigma: number = 0.045;
  private lambdaJump: number = 0.08;    // probability of a sudden jump event
  private jumpMean: number = 0.0;
  private jumpStd: number = 0.035;       // jump magnitude

  // Candlestick tracking
  public currentCandle: CandleData;
  public candles: CandleData[] = [];
  public maxCandles: number = 80;
  private ticksInCandle: number = 0;
  private ticksPerCandle: number = 10;   // at 10 ticks/sec, new candle every 1s

  constructor(
    ticker: string = 'NVXP',
    name: string = 'NovaX AI Tech',
    initialPrice: number = 85.00,
    baseVolatility: number = 0.018,
    sector: string = 'AI & Tech'
  ) {
    this.ticker = ticker;
    this.name = name;
    this.sector = sector;
    this.baseVolatility = baseVolatility;
    this.initialPrice = initialPrice;
    this.price = initialPrice;
    this.prevClose = initialPrice;

    // Distinct volatility and jump logic tailored to each stock's sector profile
    this.baseSigma = Math.max(0.012, Math.min(0.085, baseVolatility * 2.2));
    this.sigma = this.baseSigma;
    this.jumpStd = Math.max(0.012, Math.min(0.09, baseVolatility * 1.8));
    this.lambdaJump = Math.max(0.03, Math.min(0.14, baseVolatility * 4.0));

    const now = Date.now();
    this.currentCandle = {
      timestamp: Math.floor(now / 1000),
      open: this.price,
      high: this.price,
      low: this.price,
      close: this.price,
      volume: 1000
    };

    this._preSeedHistory(40);
  }

  private _gaussianRandom(): number {
    let u1 = Math.random();
    let u2 = Math.random();
    while (u1 <= 1e-15) u1 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  private _preSeedHistory(numCandles: number) {
    let p = this.initialPrice * (0.92 + Math.random() * 0.16);
    const nowSec = Math.floor(Date.now() / 1000) - numCandles;

    for (let i = 0; i < numCandles; i++) {
      const open = p;
      const ret = this._gaussianRandom() * (this.baseVolatility * 1.2 || 0.015);
      const close = Math.max(0.25, open * (1.0 + ret));
      const high = Math.max(open, close) * (1.0 + Math.abs(this._gaussianRandom() * (this.baseVolatility * 0.8 || 0.01)));
      const low = Math.max(0.1, Math.min(open, close) * (1.0 - Math.abs(this._gaussianRandom() * (this.baseVolatility * 0.8 || 0.01))));
      const vol = Math.floor(5000 + Math.random() * 45000);

      this.candles.push({
        timestamp: nowSec + i,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: vol
      });
      p = close;
    }

    this.price = Number(p.toFixed(2));
    this.prevClose = this.candles[0].open;
    this.currentCandle = {
      timestamp: Math.floor(Date.now() / 1000),
      open: this.price,
      high: this.price,
      low: this.price,
      close: this.price,
      volume: 0
    };
  }

  public get change(): number {
    return Number((this.price - this.prevClose).toFixed(2));
  }

  public get changePct(): number {
    if (this.prevClose === 0) return 0;
    return Number((((this.price - this.prevClose) / this.prevClose) * 100).toFixed(2));
  }

  /**
   * Advance simulation by dt (in seconds). Runs at 10-20 Hz.
   * Uses Geometric Brownian Motion with Merton Jump Diffusion.
   */
  public tick(dt: number = 0.1): StockTick {
    // 1. Standard Brownian Motion component: dW = sqrt(dt) * Z
    const dW = Math.sqrt(dt) * this._gaussianRandom();
    const gbmReturn = (this.mu - 0.5 * this.sigma * this.sigma) * dt + this.sigma * dW;

    // 2. Merton Jump Diffusion component: compound Poisson jump
    let jumpReturn = 0;
    if (Math.random() < this.lambdaJump * dt * 5) {
      // Volatility spike / Jump event
      jumpReturn = this.jumpMean + this.jumpStd * this._gaussianRandom();
      // Volatility cluster: briefly increase sigma for aftershocks
      this.sigma = Math.min(0.12, this.sigma + 0.015);
    } else {
      // Mean revert sigma back to baseline
      this.sigma += (this.baseSigma - this.sigma) * 0.05;
    }

    // 3. New price calculation
    const totalReturn = gbmReturn + jumpReturn;
    let nextPrice = this.price * Math.exp(totalReturn);

    // Hard bounds and minimum tick size
    nextPrice = Math.max(0.10, Math.min(9999.0, nextPrice));
    this.price = Number(nextPrice.toFixed(2));

    // Volume calculation based on price movement
    const tickVolume = Math.floor(Math.abs(totalReturn) * 80000) + Math.floor(100 + Math.random() * 500);
    this.volume += tickVolume;

    // 4. Update current candle
    this.currentCandle.high = Math.max(this.currentCandle.high, this.price);
    this.currentCandle.low = Math.min(this.currentCandle.low, this.price);
    this.currentCandle.close = this.price;
    this.currentCandle.volume += tickVolume;
    this.ticksInCandle++;

    if (this.ticksInCandle >= this.ticksPerCandle) {
      this.candles.push({ ...this.currentCandle });
      if (this.candles.length > this.maxCandles) {
        this.candles.shift();
      }
      this.currentCandle = {
        timestamp: Math.floor(Date.now() / 1000),
        open: this.price,
        high: this.price,
        low: this.price,
        close: this.price,
        volume: 0
      };
      this.ticksInCandle = 0;
    }

    return {
      ticker: this.ticker,
      price: this.price,
      open: this.currentCandle.open,
      high: this.currentCandle.high,
      low: this.currentCandle.low,
      volume: this.volume,
      change: this.change,
      changePct: this.changePct,
      timestamp: Date.now(),
      candle: { ...this.currentCandle }
    };
  }
}
