import logging

# Suppress verbose SQLAlchemy engine debug query logs in test output
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
