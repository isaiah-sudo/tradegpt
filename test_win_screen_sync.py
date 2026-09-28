"""
Unit tests verifying that the winner's win screen plays on both users' ends in 1v1 duels,
including proper synchronization of equipped animations and duel victory overlays.
"""

import unittest
import tkinter as tk
from unittest.mock import patch, MagicMock

from ui.app import TradeGPTApp
from ui.battle_panel import BattleHUD, MatchEndDialog
from ui.win_animations import WinAnimationOverlay, play_win_animation
from profile_manager import get_profile
from network.firebase_manager import FirebaseManager, SimulatedOpponentBot


class TestWinScreenBothEnds(unittest.TestCase):
    def setUp(self):
        self.profile = get_profile()
        self.orig_anim = self.profile.equipped_animation
        self.orig_duels_won = self.profile.duels_won
        self.profile.equipped_animation = "diamond_hands"

    def tearDown(self):
        self.profile.equipped_animation = self.orig_anim
        self.profile.duels_won = self.orig_duels_won
        self.profile.save()

    def test_win_animation_overlay_both_perspectives(self):
        """Test WinAnimationOverlay renders correct text for both winner and loser ends."""
        root = tk.Tk()
        root.geometry("1000x700")

        # 1. Winner perspective (is_me = True)
        overlay_winner = WinAnimationOverlay(
            root,
            animation_id="diamond_hands",
            profit_info={
                "duel_win": True,
                "is_me": True,
                "winner_name": "TraderAlice",
                "opp_name": "TraderBob",
                "diff": 3500.0,
                "profit": 1500.0
            }
        )
        self.assertIsNotNone(overlay_winner.profit_badge_text)
        badge_text_winner = overlay_winner.canvas.itemcget(overlay_winner.profit_badge_text, "text")
        self.assertIn("DUEL VICTORY", badge_text_winner)
        self.assertIn("3,500.00", badge_text_winner)
        self.assertIn("TRADERBOB", overlay_winner.canvas.itemcget(overlay_winner.sub_id, "text"))
        overlay_winner.stop()

        # 2. Loser perspective (is_me = False: opponent won, displaying winner's win screen)
        overlay_loser = WinAnimationOverlay(
            root,
            animation_id="rocket_moon",
            profit_info={
                "duel_win": True,
                "is_me": False,
                "winner_name": "TraderAlice",
                "opp_name": "TraderBob",
                "diff": 3500.0,
                "profit": 0.0
            }
        )
        self.assertIsNotNone(overlay_loser.profit_badge_text)
        badge_text_loser = overlay_loser.canvas.itemcget(overlay_loser.profit_badge_text, "text")
        self.assertIn("TraderAlice WINS", badge_text_loser)
        self.assertIn("3,500.00", badge_text_loser)
        sub_text_loser = overlay_loser.canvas.itemcget(overlay_loser.sub_id, "text")
        self.assertIn("TRADERALICE'S VICTORY CELEBRATION", sub_text_loser)
        overlay_loser.stop()

        root.destroy()

    @patch("ui.app.play_win_animation")
    def test_duel_timer_expiry_plays_win_animation_when_local_wins(self, mock_play_win):
        """When local player wins (diff > 0), win screen plays on local end with local equipped animation."""
        fb = FirebaseManager()
        match_data = {
            "duration_seconds": 180,
            "opponent": {
                "name": "RivalTrader",
                "equipped_animation": "golden_bull",
                "equity": 24000.0
            }
        }
        app = TradeGPTApp(mode="online", match_data=match_data, fb_manager=fb)
        app.update()

        # Simulate local equity $28,000 > opponent $24,000
        app.engine.realized_pnl = 3000.0
        app.battle_hud.opp_equity = 24000.0
        app.battle_hud.is_match_ended = True

        app._simulation_loop()

        self.assertTrue(mock_play_win.called)
        call_kwargs = mock_play_win.call_args[1]
        self.assertEqual(call_kwargs["animation_id"], "diamond_hands")
        self.assertTrue(call_kwargs["profit_info"]["is_me"])
        self.assertEqual(call_kwargs["profit_info"]["winner_name"], app.battle_hud.my_name)
        self.assertEqual(call_kwargs["profit_info"]["opp_name"], "RivalTrader")
        self.assertEqual(call_kwargs["profit_info"]["diff"], 4000.0)

        app.destroy()

    @patch("ui.app.play_win_animation")
    def test_duel_timer_expiry_plays_win_animation_when_opponent_wins(self, mock_play_win):
        """When opponent wins (diff < 0), winner's win screen plays on local end with opponent's equipped animation."""
        fb = FirebaseManager()
        match_data = {
            "duration_seconds": 180,
            "opponent": {
                "name": "RivalTrader",
                "equipped_animation": "golden_bull",
                "equity": 29000.0
            }
        }
        app = TradeGPTApp(mode="online", match_data=match_data, fb_manager=fb)
        app.update()

        # Simulate local equity $25,000 < opponent $29,000
        app.engine.cash = 25000.0
        app.battle_hud.opp_equity = 29000.0
        app.battle_hud.is_match_ended = True

        app._simulation_loop()

        self.assertTrue(mock_play_win.called)
        call_kwargs = mock_play_win.call_args[1]
        # Opponent's equipped animation ("golden_bull") must be played!
        self.assertEqual(call_kwargs["animation_id"], "golden_bull")
        self.assertFalse(call_kwargs["profit_info"]["is_me"])
        self.assertEqual(call_kwargs["profit_info"]["winner_name"], "RivalTrader")
        self.assertEqual(call_kwargs["profit_info"]["diff"], 4000.0)

        app.destroy()

    def test_simulated_opponent_bot_equipped_animation(self):
        """SimulatedOpponentBot assigns equipped animation and returns in tick metrics."""
        bot = SimulatedOpponentBot(name="DiamondHands_99")
        self.assertEqual(bot.equipped_animation, "diamond_hands")
        tick_metrics = bot.tick()
        self.assertEqual(tick_metrics["equipped_animation"], "diamond_hands")

        bot2 = SimulatedOpponentBot(name="WallSt_Titan")
        self.assertEqual(bot2.equipped_animation, "golden_bull")
        tick_metrics2 = bot2.tick()
        self.assertEqual(tick_metrics2["equipped_animation"], "golden_bull")

    def test_battle_hud_tracks_opponent_animation(self):
        """BattleHUD stores and updates opponent animation from constructor, update_scores, and reset_round."""
        root = tk.Tk()
        hud = BattleHUD(
            root,
            my_name="Me",
            opponent_name="Opp",
            opponent_animation="rocket_moon"
        )
        self.assertEqual(hud.opp_animation, "rocket_moon")

        # Update scores with new opponent animation
        hud.update_scores(25000.0, 0.0, 0.0, {"equity": 26000.0, "equipped_animation": "matrix_glitch"})
        self.assertEqual(hud.opp_animation, "matrix_glitch")

        # Reset round with new opponent animation
        hud.reset_round(opponent_name="NextOpp", opponent_animation="golden_bull")
        self.assertEqual(hud.opp_animation, "golden_bull")

        root.destroy()


if __name__ == "__main__":
    unittest.main()
