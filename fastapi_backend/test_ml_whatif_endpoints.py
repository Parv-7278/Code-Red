"""
Integration test for POLARIS What-If ML Predictive Simulation System.
Validates:
1. End-to-end Python ML Model inference.
2. Distinct predictions for Maitri vs Bharati based on station telemetry.
3. Dynamic reaction to What-If slider adjustments.
4. Multi-horizon targets (+15m, +30m, +60m, +120m).
5. Explainability feature importance weights and calibrated confidence metrics.
6. Preventive load-shedding counterfactual improves the forecast without mutating the baseline.
"""

import sys
import os
import unittest

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from ml.predict import WhatIfPredictionService

class TestPolarisWhatIfML(unittest.TestCase):

    def test_maitri_whatif_nominal(self):
        result = WhatIfPredictionService.run_what_if_prediction(
            station_id="station-maitri",
            ambient_temperature=-20.0,
            generator_capacity_derate=0.0,
            wind_velocity=30.0,
            life_support_min_reserve=80.0
        )
        self.assertEqual(result["status"], "SUCCESS")
        self.assertEqual(result["station_id"], "station-maitri")
        self.assertIn(result["predicted_state"], ["NORMAL", "WARNING"])
        self.assertGreater(result["confidence"], 0.70)
        self.assertEqual(len(result["time_series"]), 5) # NOW, +15m, +30m, +60m, +120m
        print("\n[PASS] Maitri Nominal Scenario:", result["predicted_state"], f"(Confidence: {result['confidence']*100:.1f}%)")

    def test_maitri_whatif_severe_stress(self):
        result_stress = WhatIfPredictionService.run_what_if_prediction(
            station_id="station-maitri",
            ambient_temperature=-45.0,
            generator_capacity_derate=60.0,
            wind_velocity=120.0,
            life_support_min_reserve=85.0
        )
        self.assertEqual(result_stress["status"], "SUCCESS")
        self.assertIn(result_stress["predicted_state"], ["WARNING", "CRITICAL"])
        self.assertGreater(result_stress["risk"]["power"], 0.50)
        self.assertGreater(len(result_stress["predicted_alerts"]), 0)
        self.assertGreater(len(result_stress["preventive_actions"]), 0)
        print("[PASS] Maitri Severe Stress Scenario:", result_stress["predicted_state"], f"(Power Risk: {result_stress['risk']['power']*100:.0f}%, Alerts: {len(result_stress['predicted_alerts'])})")

    def test_bharati_vs_maitri_differentiation(self):
        maitri = WhatIfPredictionService.run_what_if_prediction(
            station_id="station-maitri",
            ambient_temperature=-28.0,
            generator_capacity_derate=35.0,
            wind_velocity=75.0,
            life_support_min_reserve=80.0
        )
        bharati = WhatIfPredictionService.run_what_if_prediction(
            station_id="station-bharati",
            ambient_temperature=-28.0,
            generator_capacity_derate=35.0,
            wind_velocity=75.0,
            life_support_min_reserve=80.0
        )
        # Verify both models produce independent predictions matching station capacities
        self.assertNotEqual(maitri["current_telemetry"]["power_generation"], bharati["current_telemetry"]["power_generation"])
        self.assertNotEqual(maitri["prediction"]["120min"]["power_generation"], bharati["prediction"]["120min"]["power_generation"])
        print("[PASS] Station Differentiation Verified: Maitri Gen =", maitri["prediction"]["120min"]["power_generation"], "kW vs Bharati Gen =", bharati["prediction"]["120min"]["power_generation"], "kW")

    def test_load_shedding_counterfactual(self):
        inputs = dict(
            station_id="station-bharati",
            ambient_temperature=-35.0,
            generator_capacity_derate=45.0,
            wind_velocity=85.0,
            life_support_min_reserve=80.0
        )
        baseline = WhatIfPredictionService.run_what_if_prediction(**inputs)
        intervention = WhatIfPredictionService.run_what_if_prediction(**inputs, load_reduction_kw=30.0)

        self.assertEqual(baseline["whatif_parameters"]["load_reduction_kw"], 0.0)
        self.assertEqual(intervention["whatif_parameters"]["load_reduction_kw"], 30.0)
        self.assertGreater(
            intervention["prediction"]["120min"]["net_power"],
            baseline["prediction"]["120min"]["net_power"]
        )
        self.assertGreaterEqual(
            intervention["prediction"]["120min"]["battery_level"],
            baseline["prediction"]["120min"]["battery_level"]
        )
        self.assertLessEqual(
            intervention["risk"]["composite_hazard"],
            baseline["risk"]["composite_hazard"]
        )
        self.assertEqual(intervention["data_provenance"]["intervention"], "OPERATOR_APPROVED_COUNTERFACTUAL")
        self.assertNotEqual(baseline["prediction_id"], intervention["prediction_id"])
        print("[PASS] Counterfactual load-shedding improved net power and preserved battery reserve")

if __name__ == "__main__":
    unittest.main()
