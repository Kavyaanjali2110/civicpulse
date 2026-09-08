import os
from sqlalchemy.orm import Session
from app.core.database import Base, engine, SessionLocal
import app.models  # Registers all models including Notification with Base.metadata
from app.db.seed_data import seed_database


def init_db(db: Session = None, force_seed: bool = False):
    """Initializes the database schema and populates initial municipal seed records.
    
    When force_seed=True, drops all existing tables and re-creates them from scratch.
    This is required after schema changes (e.g., adding ward_id columns) in the SQLite demo environment.
    """
    # Ensure data directory exists
    os.makedirs("./data", exist_ok=True)
    os.makedirs("./data/models", exist_ok=True)
    os.makedirs("./data/seed", exist_ok=True)

    if force_seed:
        # Drop all tables and recreate — clean slate for schema migrations
        Base.metadata.drop_all(bind=engine)

    # Create all tables registered with SQLAlchemy Base
    Base.metadata.create_all(bind=engine)

    # Seed initial data
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        result = seed_database(db, force=force_seed)
        return result
    finally:
        if close_session:
            db.close()


if __name__ == "__main__":
    print("Initializing CivicPulse AI Database (force re-seed)...")
    res = init_db(force_seed=True)
    print("Database initialization result:", res)
