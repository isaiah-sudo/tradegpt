/**
 * Real-Time WebSocket Client for 1v1 High-Frequency Live Trading Game.
 * Communicates with the Node.js / TypeScript authoritative game server.
 * Handles sub-second ticks, Omegle-style matchmaking, and synchronized match clocks.
 */

class LiveTradeWsClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.isSearching = false;
        this.inMatch = false;
        this.roomId = null;
        this.currentOpponent = null;
        this.latencyMs = 0;
        this.pingTimer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // Callbacks
        this.onQueueStatus = null;
        this.onMatchCountdown = null;
        this.onMatchStart = null;
        this.onMarketTick = null;
        this.onOrderAck = null;
        this.onPortfolioUpdate = null;
        this.onMatchEnd = null;
        this.onConnectionChange = null;

        this._connect();
    }

    _getWsUrl() {
        const isSecure = (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:');
        const protocol = isSecure ? 'wss:' : 'ws:';
        let host = (typeof window !== 'undefined' && window.location && window.location.host) ? window.location.host : 'localhost:4002';

        if (!host || host === '' || (host.startsWith('127.0.0.1') && !host.includes(':'))) {
            host = 'localhost:4002';
        }

        return `${protocol}//${host}/ws`;
    }

    _connect() {
        try {
            const url = this._getWsUrl();
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this._startPing();
                if (this.onConnectionChange) this.onConnectionChange(true);
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this._handleMessage(msg);
                } catch (e) {
                    console.error("[WS] Parse error:", e);
                }
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this._stopPing();
                if (this.onConnectionChange) this.onConnectionChange(false);
                this._attemptReconnect();
            };

            this.ws.onerror = (err) => {
                this.isConnected = false;
            };
        } catch (e) {
            this.isConnected = false;
        }
    }

    _attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(3000, 500 * Math.pow(1.5, this.reconnectAttempts));
            setTimeout(() => this._connect(), delay);
        }
    }

    _startPing() {
        this._stopPing();
        this.pingTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
        }, 3000);
    }

    _stopPing() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    _handleMessage(msg) {
        switch (msg.type) {
            case 'pong':
                if (msg.timestamp) {
                    this.latencyMs = Math.max(1, Date.now() - msg.timestamp);
                }
                break;

            case 'queue_status':
                this.isSearching = true;
                if (this.onQueueStatus) this.onQueueStatus(msg);
                break;

            case 'match_countdown':
                this.isSearching = false;
                this.roomId = msg.roomId;
                this.currentOpponent = msg.opponent;
                if (this.onMatchCountdown) this.onMatchCountdown(msg);
                break;

            case 'match_start':
                this.isSearching = false;
                this.inMatch = true;
                this.roomId = msg.roomId;
                this.currentOpponent = msg.opponent;
                if (this.onMatchStart) this.onMatchStart(msg);
                break;

            case 'market_tick':
                if (this.onMarketTick) this.onMarketTick(msg);
                break;

            case 'stock_data':
                if (this.onStockData) this.onStockData(msg);
                break;

            case 'market_batch':
                if (this.onMarketBatch) this.onMarketBatch(msg);
                break;

            case 'order_ack':
                if (this.onOrderAck) this.onOrderAck(msg);
                break;

            case 'portfolio_update':
                if (this.onPortfolioUpdate) this.onPortfolioUpdate(msg);
                break;

            case 'match_end':
                this.inMatch = false;
                if (this.onMatchEnd) this.onMatchEnd(msg);
                break;
        }
    }

    send(msg) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
            return true;
        }
        return false;
    }

    joinQueue(nickname = "Trader", equippedTitle = "title_trader", equippedAnimation = "money_rain", duration = 60) {
        let dur = duration;
        let nick = nickname;
        let title = equippedTitle;
        let anim = equippedAnimation;

        if (typeof nickname === 'number') {
            dur = nickname;
            nick = "Trader";
        } else if (typeof nickname === 'object' && nickname !== null) {
            nick = nickname.nickname || "Trader";
            title = nickname.equippedTitle || "title_trader";
            anim = nickname.equippedAnimation || "money_rain";
            dur = nickname.duration || 60;
        }

        this.isSearching = true;
        this.selectedDuration = dur;
        return this.send({
            type: 'join_queue',
            nickname: nick,
            equippedTitle: title,
            equippedAnimation: anim,
            duration: dur
        });
    }

    cancelQueue() {
        this.isSearching = false;
        return this.send({ type: 'cancel_queue' });
    }

    sendOrder(side, ticker, qty, leverage = 1) {
        return this.send({
            type: 'order',
            side,
            ticker,
            qty,
            leverage
        });
    }

    watchTicker(ticker) {
        if (!ticker) return false;
        return this.send({
            type: 'watch_ticker',
            ticker
        });
    }

    nextOpponent(duration = null) {
        // Instant Omegle-style re-match with same or specified duration
        this.inMatch = false;
        this.isSearching = true;
        const dur = duration || this.selectedDuration || 60;
        return this.send({ type: 'next_opponent', duration: dur });
    }

    leaveMatch() {
        this.inMatch = false;
        this.isSearching = false;
        this.roomId = null;
        return this.send({ type: 'leave_match' });
    }
}

// Export for module or global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LiveTradeWsClient };
} else {
    window.LiveTradeWsClient = LiveTradeWsClient;
}
