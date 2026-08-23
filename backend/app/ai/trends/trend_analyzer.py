from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.complaint import Complaint
from app.models.category import Category


class TrendAnalyzer:
    """Time-series analysis and emerging infrastructure anomaly detection."""

    @classmethod
    def analyze_trends(cls, db: Session, ward_id: Optional[int] = None) -> Dict[str, Any]:
        """Calculates 7-day vs 30-day category velocity and flags emerging spikes.
        
        Args:
            db: Database session.
            ward_id: When provided, restricts analysis to complaints in that ward.
        """
        now = datetime.now(timezone.utc)
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)

        categories = db.query(Category).all()
        category_trends = []

        total_last_7 = 0

        for cat in categories:
            def ward_count(extra_filter=None):
                q = db.query(func.count(Complaint.id)).filter(
                    Complaint.category_id == cat.id
                )
                if ward_id is not None:
                    q = q.filter(Complaint.ward_id == ward_id)
                if extra_filter is not None:
                    q = q.filter(extra_filter)
                return q.scalar() or 0

            count_7d = ward_count(Complaint.created_at >= seven_days_ago)
            count_prev_23d = ward_count(
                (Complaint.created_at >= thirty_days_ago) & (Complaint.created_at < seven_days_ago)
            )

            total_last_7 += count_7d

            weekly_rate_curr = count_7d
            weekly_rate_baseline = (count_prev_23d / 23.0) * 7.0 if count_prev_23d > 0 else 1.0

            growth_rate = round(((weekly_rate_curr - weekly_rate_baseline) / weekly_rate_baseline) * 100, 1)
            is_surge = growth_rate > 50.0 and count_7d >= 3

            category_trends.append({
                "category_id": cat.id,
                "category_code": cat.code,
                "category_name": cat.name,
                "count_last_7d": count_7d,
                "baseline_weekly_avg": round(weekly_rate_baseline, 1),
                "growth_percentage": growth_rate,
                "is_surge": is_surge,
                "status": "SURGE_DETECTED" if is_surge else ("STABLE" if count_7d > 0 else "LOW_ACTIVITY")
            })

        # Daily timeline distribution for past 14 days
        daily_series = []
        for d in range(14, -1, -1):
            day_start = (now - timedelta(days=d)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_q = db.query(func.count(Complaint.id)).filter(
                Complaint.created_at >= day_start,
                Complaint.created_at < day_end
            )
            if ward_id is not None:
                day_q = day_q.filter(Complaint.ward_id == ward_id)
            day_count = day_q.scalar() or 0

            daily_series.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "display_date": day_start.strftime("%b %d"),
                "complaints": day_count
            })

        return {
            "period": "Last 30 Days",
            "total_active_7d": total_last_7,
            "category_trends": category_trends,
            "daily_series": daily_series,
            "emerging_alerts": [
                f"Surge detected in {t['category_name']}: +{t['growth_percentage']}% rise in 7 days."
                for t in category_trends if t["is_surge"]
            ]
        }


trend_analyzer = TrendAnalyzer()
