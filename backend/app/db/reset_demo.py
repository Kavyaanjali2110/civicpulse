"""CivicPulse AI — Standalone Demo Reset Script
Usage: python -m app.db.reset_demo

Restores a pristine, deterministic demonstration state across:
- Reactive grievances (Tracks A)
- Predictive asset health & failure risk models (Track B)
- Omnichannel intake & citizen notifications (Track C)

WARNING: This script drops and recreates SQLite database tables. Development / Demo ONLY.
"""

import sys
import os
from app.core.config import settings
from app.db.init_db import init_db
from app.core.database import SessionLocal
from app.models.complaint import Complaint
from app.models.infrastructure import InfrastructureAsset
from app.models.hotspot import HotspotCluster
from app.models.field_crew import FieldCrew
from app.models.notification import Notification
from app.models.preventive_maintenance import PreventiveMaintenanceOrder


def reset_demo():
    print("=" * 60)
    print(" CivicPulse AI - Deterministic Demo State Reset")
    print("=" * 60)

    # Safety check: Prevent accidental drops in production
    if settings.ENVIRONMENT.lower() == "production" and not os.getenv("ALLOW_PROD_RESET"):
        print("[ERROR] Demo reset is disabled in production environment.")
        sys.exit(1)

    print("[1/3] Purging database and recreating schema...")
    init_db(force_seed=True)

    print("[2/3] Verifying seeded entities...")
    db = SessionLocal()
    try:
        complaint_count = db.query(Complaint).count()
        asset_count = db.query(InfrastructureAsset).count()
        hotspot_count = db.query(HotspotCluster).count()
        crew_count = db.query(FieldCrew).count()
        notif_count = db.query(Notification).count()
        order_count = db.query(PreventiveMaintenanceOrder).count()

        print(f"       Complaints seeded:              {complaint_count}")
        print(f"       Infrastructure Assets seeded:   {asset_count}")
        print(f"       Hotspot Clusters seeded:        {hotspot_count}")
        print(f"       Field Crews active:             {crew_count}")
        print(f"       Notifications logged:           {notif_count}")
        print(f"       Preventive Work Orders:         {order_count}")

        print("[3/3] Demo state restored successfully!")
        print("=" * 60)
        print("Ready for Flagship Presentation Walkthrough.")
        print("=" * 60)
        return {
            "status": "success",
            "complaints": complaint_count,
            "assets": asset_count,
            "hotspots": hotspot_count,
            "crews": crew_count,
            "notifications": notif_count,
            "preventive_orders": order_count,
        }
    finally:
        db.close()


if __name__ == "__main__":
    reset_demo()
