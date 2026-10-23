import { OrderSide, PlayerState, PositionState } from './types';

export class OrderEngine {
  public static createPlayerState(
    id: string,
    nickname: string,
    equippedTitle: string = 'title_trader',
    equippedAnimation: string = 'money_rain',
    initialCash: number = 25000.0
  ): PlayerState {
    return {
      id,
      nickname,
      equippedTitle,
      equippedAnimation,
      cash: initialCash,
      equity: initialCash,
      initialCash,
      buyingPower: initialCash * 4, // standard 4x intraday baseline without high leverage toggle
      realizedPnL: 0.0,
      unrealizedPnL: 0.0,
      totalPnL: 0.0,
      totalPnLPct: 0.0,
      position: null,
      status: 'playing'
    };
  }

  /**
   * Recalculates unrealized PnL, equity, buying power and checks for liquidation.
   */
  public static updatePortfolio(player: PlayerState, currentPrice: number): void {
    if (player.status !== 'playing') return;

    if (!player.position || player.position.shares === 0) {
      player.unrealizedPnL = 0.0;
      player.equity = player.cash;
      player.buyingPower = Math.max(0, player.equity * 4);
    } else {
      const pos = player.position;
      pos.marketValue = Number((Math.abs(pos.shares) * currentPrice).toFixed(2));

      if (pos.shares > 0) {
        // LONG position
        pos.unrealizedPnL = Number(((currentPrice - pos.avgEntry) * pos.shares).toFixed(2));
      } else {
        // SHORT position
        pos.unrealizedPnL = Number(((pos.avgEntry - currentPrice) * Math.abs(pos.shares)).toFixed(2));
      }

      pos.unrealizedPnLPct = Number((((currentPrice - pos.avgEntry) / pos.avgEntry) * 100 * (pos.shares > 0 ? 1 : -1)).toFixed(2));

      player.unrealizedPnL = pos.unrealizedPnL;
      player.equity = Number((player.cash + player.unrealizedPnL).toFixed(2));

      // Buying power based on remaining equity after margin collateral
      const leverage = pos.leverage || 1;
      const marginReq = pos.marketValue / leverage;
      pos.marginUsed = Number(marginReq.toFixed(2));

      player.buyingPower = Math.max(0, (player.equity - pos.marginUsed) * leverage);

      // Check for Liquidation: if equity drops below 15% of margin required
      const maintenanceMargin = pos.marginUsed * 0.15;
      if (player.equity <= maintenanceMargin) {
        // AUTO-LIQUIDATE
        this.liquidate(player, currentPrice);
        return;
      }
    }

    player.totalPnL = Number((player.realizedPnL + player.unrealizedPnL).toFixed(2));
    player.totalPnLPct = Number(((player.totalPnL / player.initialCash) * 100).toFixed(2));
  }

  public static liquidate(player: PlayerState, currentPrice: number): void {
    if (!player.position) return;
    const pos = player.position;
    const realizedDelta = pos.unrealizedPnL;
    player.realizedPnL += realizedDelta;
    player.cash = Math.max(0, player.cash + realizedDelta);
    player.equity = player.cash;
    player.unrealizedPnL = 0;
    player.totalPnL = player.realizedPnL;
    player.totalPnLPct = ((player.totalPnL / player.initialCash) * 100);
    player.position = null;
    player.buyingPower = 0;
    player.status = 'liquidated';
  }

  /**
   * Authoritative execution of orders.
   */
  public static executeOrder(
    player: PlayerState,
    side: OrderSide,
    ticker: string,
    requestedQty: number,
    currentPrice: number,
    leverage: number = 1
  ): { success: boolean; executedShares: number; price: number; message: string } {
    if (player.status !== 'playing') {
      return { success: false, executedShares: 0, price: currentPrice, message: `Account is ${player.status}` };
    }

    const lev = Math.max(1, Math.min(50, leverage));

    if (side === 'FLATTEN') {
      if (!player.position || player.position.shares === 0) {
        return { success: true, executedShares: 0, price: currentPrice, message: 'Already flat' };
      }
      const closingShares = player.position.shares;
      const realized = player.position.unrealizedPnL;
      player.realizedPnL += realized;
      player.cash += realized;
      player.position = null;
      this.updatePortfolio(player, currentPrice);
      return { success: true, executedShares: Math.abs(closingShares), price: currentPrice, message: `Position flattened at $${currentPrice}` };
    }

    if (side === 'REVERSE') {
      if (!player.position || player.position.shares === 0) {
        return { success: false, executedShares: 0, price: currentPrice, message: 'No active position to reverse' };
      }
      const prevShares = player.position.shares;
      const closingRealized = player.position.unrealizedPnL;
      player.realizedPnL += closingRealized;
      player.cash += closingRealized;

      // Reverse to same size opposite direction
      const newShares = -prevShares;
      player.position = {
        ticker,
        shares: newShares,
        avgEntry: currentPrice,
        leverage: lev,
        marketValue: Math.abs(newShares) * currentPrice,
        unrealizedPnL: 0,
        unrealizedPnLPct: 0,
        marginUsed: (Math.abs(newShares) * currentPrice) / lev
      };
      this.updatePortfolio(player, currentPrice);
      return { success: true, executedShares: Math.abs(newShares), price: currentPrice, message: `Reversed position to ${newShares > 0 ? 'LONG' : 'SHORT'} ${Math.abs(newShares)} shares` };
    }

    const qty = Math.max(1, Math.floor(requestedQty));
    const notional = qty * currentPrice;
    const requiredMargin = notional / lev;

    if (side === 'BUY') {
      // If currently SHORT, buy covers first
      if (player.position && player.position.shares < 0) {
        const shortShares = Math.abs(player.position.shares);
        const coverQty = Math.min(shortShares, qty);
        const realized = (player.position.avgEntry - currentPrice) * coverQty;
        player.realizedPnL += realized;
        player.cash += realized;

        const remainingShort = shortShares - coverQty;
        if (remainingShort === 0) {
          player.position = null;
        } else {
          player.position.shares = -remainingShort;
        }

        const leftoverBuy = qty - coverQty;
        if (leftoverBuy > 0) {
          const buyNotional = leftoverBuy * currentPrice;
          const buyMargin = buyNotional / lev;
          if (buyMargin > player.cash) {
            this.updatePortfolio(player, currentPrice);
            return { success: true, executedShares: coverQty, price: currentPrice, message: `Covered ${coverQty} shares. Insufficient margin for remaining buy.` };
          }
          player.position = {
            ticker,
            shares: leftoverBuy,
            avgEntry: currentPrice,
            leverage: lev,
            marketValue: leftoverBuy * currentPrice,
            unrealizedPnL: 0,
            unrealizedPnLPct: 0,
            marginUsed: buyMargin
          };
        }
        this.updatePortfolio(player, currentPrice);
        return { success: true, executedShares: qty, price: currentPrice, message: `Filled BUY ${qty} @ $${currentPrice}` };
      }

      // Add to LONG position
      if (requiredMargin > player.cash) {
        return { success: false, executedShares: 0, price: currentPrice, message: 'Insufficient margin / cash' };
      }

      if (player.position && player.position.shares > 0) {
        const totalShares = player.position.shares + qty;
        const totalCost = (player.position.shares * player.position.avgEntry) + notional;
        player.position.avgEntry = Number((totalCost / totalShares).toFixed(2));
        player.position.shares = totalShares;
        player.position.leverage = lev;
      } else {
        player.position = {
          ticker,
          shares: qty,
          avgEntry: currentPrice,
          leverage: lev,
          marketValue: notional,
          unrealizedPnL: 0,
          unrealizedPnLPct: 0,
          marginUsed: requiredMargin
        };
      }
      this.updatePortfolio(player, currentPrice);
      return { success: true, executedShares: qty, price: currentPrice, message: `Filled BUY ${qty} @ $${currentPrice}` };
    }

    if (side === 'SELL') {
      if (!player.position || player.position.shares <= 0) {
        return { success: false, executedShares: 0, price: currentPrice, message: 'No LONG position to sell' };
      }
      const sellQty = Math.min(player.position.shares, qty);
      const realized = (currentPrice - player.position.avgEntry) * sellQty;
      player.realizedPnL += realized;
      player.cash += realized;

      const remaining = player.position.shares - sellQty;
      if (remaining === 0) {
        player.position = null;
      } else {
        player.position.shares = remaining;
      }
      this.updatePortfolio(player, currentPrice);
      return { success: true, executedShares: sellQty, price: currentPrice, message: `Filled SELL ${sellQty} @ $${currentPrice}` };
    }

    if (side === 'SHORT') {
      if (player.position && player.position.shares > 0) {
        return { success: false, executedShares: 0, price: currentPrice, message: 'Close long position before shorting' };
      }
      if (requiredMargin > player.cash) {
        return { success: false, executedShares: 0, price: currentPrice, message: 'Insufficient margin to short' };
      }

      if (player.position && player.position.shares < 0) {
        const totalShares = Math.abs(player.position.shares) + qty;
        const totalCost = (Math.abs(player.position.shares) * player.position.avgEntry) + notional;
        player.position.avgEntry = Number((totalCost / totalShares).toFixed(2));
        player.position.shares = -totalShares;
        player.position.leverage = lev;
      } else {
        player.position = {
          ticker,
          shares: -qty,
          avgEntry: currentPrice,
          leverage: lev,
          marketValue: notional,
          unrealizedPnL: 0,
          unrealizedPnLPct: 0,
          marginUsed: requiredMargin
        };
      }
      this.updatePortfolio(player, currentPrice);
      return { success: true, executedShares: qty, price: currentPrice, message: `Filled SHORT ${qty} @ $${currentPrice}` };
    }

    if (side === 'COVER') {
      if (!player.position || player.position.shares >= 0) {
        return { success: false, executedShares: 0, price: currentPrice, message: 'No SHORT position to cover' };
      }
      const coverQty = Math.min(Math.abs(player.position.shares), qty);
      const realized = (player.position.avgEntry - currentPrice) * coverQty;
      player.realizedPnL += realized;
      player.cash += realized;

      const remaining = Math.abs(player.position.shares) - coverQty;
      if (remaining === 0) {
        player.position = null;
      } else {
        player.position.shares = -remaining;
      }
      this.updatePortfolio(player, currentPrice);
      return { success: true, executedShares: coverQty, price: currentPrice, message: `Filled COVER ${coverQty} @ $${currentPrice}` };
    }

    return { success: false, executedShares: 0, price: currentPrice, message: `Unknown order side: ${side}` };
  }
}
