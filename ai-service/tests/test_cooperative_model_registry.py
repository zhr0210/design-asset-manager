import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import core.cooperative_model_registry as cooperative_model_registry


class TestCooperativeModelRegistry(unittest.TestCase):
    def test_windows_default_root_uses_appdata_user_data(self):
        with patch("core.cooperative_model_registry.sys.platform", "win32"):
            with patch.dict(os.environ, {"APPDATA": "/tmp/appdata"}, clear=False):
                root = cooperative_model_registry._cooperative_root()

        self.assertEqual(
            root,
            Path("/tmp/appdata") / "design-asset-manager" / "AIModels" / "cooperative",
        )

    def test_configured_model_root_wins(self):
        with patch.dict(os.environ, {"DESIGN_ASSET_MANAGER_MODEL_ROOT": "/tmp/dam-models"}, clear=False):
            root = cooperative_model_registry._cooperative_root()

        self.assertEqual(root, Path("/tmp/dam-models") / "cooperative")


if __name__ == "__main__":
    unittest.main()
