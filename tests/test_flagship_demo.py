"""Root test forwarder for Flagship End-to-End Demo Story.
Allows running `python tests/test_flagship_demo.py` from the project root.
"""

import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Ensure current working directory is backend for relative data paths
os.chdir(backend_dir)

from tests.verify_flagship_demo import test_flagship_end_to_end_demo

__all__ = ["test_flagship_end_to_end_demo"]

if __name__ == "__main__":
    test_flagship_end_to_end_demo()
