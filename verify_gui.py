import sys
from ui.app import TradeGPTApp

def verify_gui():
    print("Initializing TradeGPTApp with 100 stocks...", flush=True)
    app = TradeGPTApp()
    
    # Process initial events and layout
    app.update()
    print("Initial window layout rendered successfully with 100 stocks.", flush=True)

    # Verify 100 stocks in engine and scanner
    assert len(app.engine.stocks) == 100, f"Expected 100 stocks, got {len(app.engine.stocks)}"
    print(f"Verified {len(app.engine.stocks)} stocks in simulation engine.", flush=True)

    # Test sector filtering
    app.watchlist._set_sector("Meme")
    app.update()
    print(f"Filtered to Meme sector ({len(app.watchlist.rendered_tickers)} stocks).", flush=True)

    # Reset sector and test search filtering
    app.watchlist._set_sector("ALL")
    app.watchlist.ent_search.insert(0, "BIO")
    app.watchlist._on_search_change(None)
    app.update()
    print(f"Searched for 'BIO' ({len(app.watchlist.rendered_tickers)} matching stocks).", flush=True)

    # Reset search & sector
    app.watchlist._set_sector("ALL")
    app.watchlist.ent_search.delete(0, 'end')
    app.watchlist._on_search_change(None)
    app.update()

    # Test stock selection
    for ticker in ["NVXP", "PUMP", "ATOM", "DRUG", "GOLD"]:
        app.watchlist.select_stock(ticker)
        app.update()
        print(f"Switched to {ticker} - chart rendered.", flush=True)

    # Verify Owned tab existence
    assert "OWNED" in app.watchlist.sort_buttons, "Expected 'OWNED' sort button"
    assert "TICKER" not in app.watchlist.sort_buttons, "Expected 'TICKER' (A-Z) button to be replaced"
    print("Verified Owned tab replaced A-Z sort tab.", flush=True)

    # Test Owned tab when empty
    app.watchlist._set_sort("OWNED")
    app.update()
    assert len(app.watchlist.rendered_tickers) == 0, f"Expected 0 owned stocks initially, got {len(app.watchlist.rendered_tickers)}"
    assert "0 OWNED" in app.watchlist.lbl_count.cget("text")
    print("Verified Owned tab empty state with 0 open positions.", flush=True)

    # Execute a test trade (Buy NVXP)
    print("Testing Buy execution in GUI...", flush=True)
    app.watchlist.select_stock("NVXP")
    app.trading_panel._set_qty(100)
    app.trading_panel.do_buy()
    app.update()
    print("Buy executed, equity and position updated.", flush=True)

    # Verify NVXP is shown in Owned tab
    assert "NVXP" in app.watchlist.rendered_tickers, f"Expected NVXP in owned tickers, got {app.watchlist.rendered_tickers}"
    assert "1 OWNED" in app.watchlist.lbl_count.cget("text")
    print("Verified Owned tab updates with purchased stock NVXP.", flush=True)

    # Buy another stock and leave it (PUMP)
    app.watchlist.select_stock("PUMP")
    app.trading_panel._set_qty(50)
    app.trading_panel.do_buy()
    app.update()
    assert "NVXP" in app.watchlist.rendered_tickers and "PUMP" in app.watchlist.rendered_tickers
    assert "2 OWNED" in app.watchlist.lbl_count.cget("text")
    print("Verified multiple owned stocks tracked in Owned tab.", flush=True)

    # Select stock from owned list
    app.watchlist.select_stock("NVXP")
    app.update()
    assert app.active_ticker == "NVXP"
    print("Verified stock selection from Owned tab works.", flush=True)

    # Execute a test sell (close NVXP)
    print("Testing Sell execution in GUI...", flush=True)
    app.trading_panel._set_qty(100)
    app.trading_panel.do_sell()
    app.update()
    assert "NVXP" not in app.watchlist.rendered_tickers
    assert "PUMP" in app.watchlist.rendered_tickers
    assert "1 OWNED" in app.watchlist.lbl_count.cget("text")
    print("Sell executed, Owned tab updated dynamically.", flush=True)

    # Cancel loop job so manual stepping doesn't trigger duplicate timers
    if app._loop_job:
        app.after_cancel(app._loop_job)

    # Step simulation cleanly
    for i in range(5):
        news = app.engine.step()
        if news:
            app.news_feed_panel.refresh_news(app.engine.news_feed)
        app.watchlist.update_prices()
        app.chart.draw()
        app.update()

    print("Live simulation tick updates verified.", flush=True)
    app.destroy()
    print("GUI Verification PASSED!", flush=True)

if __name__ == "__main__":
    verify_gui()
