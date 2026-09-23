"""Pytest integration for Flagship End-to-End Demo Story.
Runs all 6 sequential steps:
1. Citizen WhatsApp Ingestion
2. Government Priority Queue & Field Crew Assignment
3. Field Crew Acceptance, Evidence Upload & Resolution
4. Citizen Tracker Verification & 5-Star Review
5. Predictive Infrastructure Intelligence & Preventive Work Order
6. Field Crew Preventive Maintenance Execution & Completion
"""

from tests.verify_flagship_demo import test_flagship_end_to_end_demo

__all__ = ["test_flagship_end_to_end_demo"]


if __name__ == "__main__":
    test_flagship_end_to_end_demo()
