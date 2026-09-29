"""
Unit tests for Trading Engine Temperature feature and Settings Menu Dialog.
Verifies volatility scaling, online duel immutability, and profile persistence.
"""

import unittest
import tkinter as tk
import tempfile
import os
import json
from simulation.stock import Stock
from simulation.engine import MarketEngine
from profile_manager import UserProfile
from ui.app import TradeGPTApp
from ui.settings_dialog import SettingsDialog


class TestTradingEngineTemperature(unittest.TestCase):
    def test_stock_temperature_scaling(self):
        stock_calm = Stock("TEST1", "Calm Stock", "Tech", initial_price=100.0, volatility=0.02, temperature=0.5)
        stock_std = Stock("TEST2", "Standard Stock", "Tech", initial_price=100.0, volatility=0.02, temperature=1.0)
        stock_wild = Stock("TEST3", "Wild Stock", "Tech", initial_price=100.0, volatility=0.02, temperature=2.5)

        self.assertAlmostEqual(stock_calm.temperature, 0.5)
        self.assertAlmostEqual(stock_calm.volatility, 0.01)

        self.assertAlmostEqual(stock_std.temperature, 1.0)
        self.assertAlmostEqual(stock_std.volatility, 0.02)

        self.assertAlmostEqual(stock_wild.temperature, 2.5)
        self.assertAlmostEqual(stock_wild.volatility, 0.05)

    def test_engine_set_temperature(self):
        engine = MarketEngine(initial_cash=25000.0, temperature=1.0)
        self.assertEqual(engine.get_temperature(), 1.0)

        # Update to 2.0x
        engine.set_temperature(2.0)
        self.assertEqual(engine.get_temperature(), 2.0)
        for st in engine.stocks.values():
            self.assertEqual(st.temperature, 2.0)
            self.assertAlmostEqual(st.volatility, st.base_volatility * 2.0)

        # Update to 0.4x
        engine.set_temperature(0.4)
        self.assertEqual(engine.get_temperature(), 0.4)
        for st in engine.stocks.values():
            self.assertEqual(st.temperature, 0.4)
            self.assertAlmostEqual(st.volatility, st.base_volatility * 0.4)

    def test_duel_mode_enforces_standard_temperature(self):
        # Online competitive duel must force 1.0 temperature regardless of profile
        match_data = {"duration_seconds": 180, "seed": 4242, "opponent": {"name": "DuelMaster"}}
        app = TradeGPTApp(mode="online", match_data=match_data)
        app.update()

        self.assertEqual(app.engine.get_temperature(), 1.0)
        for st in app.engine.stocks.values():
            self.assertEqual(st.temperature, 1.0)
        app.destroy()

    def test_solo_mode_applies_profile_temperature(self):
        profile = UserProfile()
        profile.trading_temperature = 1.8

        app = TradeGPTApp(mode="solo")
        app.profile = profile
        app.engine.set_temperature(profile.trading_temperature)
        app.update()

        self.assertEqual(app.engine.get_temperature(), 1.8)
        app.destroy()

    def test_profile_persistence(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = os.path.join(tmpdir, "test_profile.json")
            p = UserProfile()
            p._file_path = file_path
            p.set_trading_temperature(2.25)

            # Load back
            p2 = UserProfile()
            p2._file_path = file_path
            p2.load()
            self.assertAlmostEqual(p2.trading_temperature, 2.25)

    def test_settings_dialog_interaction(self):
        root = tk.Tk()
        root.withdraw()
        changed_values = []
        def on_change(val):
            changed_values.append(val)

        p = UserProfile()
        p.trading_temperature = 1.0
        dlg = SettingsDialog(root, current_temp=1.0, on_temp_changed=on_change, profile=p)
        dlg.update()

        # Test preset change
        dlg._apply_preset(1.5)
        dlg.update()
        self.assertEqual(dlg.temperature, 1.5)
        self.assertIn(1.5, changed_values)

        # Test slider change
        dlg._on_slider_change("0.60")
        dlg.update()
        self.assertEqual(dlg.temperature, 0.60)
        self.assertIn(0.60, changed_values)

        # Test save and close
        dlg._save_and_close()
        self.assertEqual(p.trading_temperature, 0.60)

        root.destroy()


if __name__ == "__main__":
    unittest.main()
