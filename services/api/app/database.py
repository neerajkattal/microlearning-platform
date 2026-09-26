from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

# The SQLAlchemy engine — manages the actual pool of connections to Postgres.
engine = create_engine(settings.database_url)
# Factory for creating new DB sessions bound to that engine.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base class every ORM model (models/*.py) inherits from.
Base = declarative_base()


# FastAPI dependency: opens one DB session per request, hands it to the
# route/handler via `yield`, then always closes it afterward (even if the
# request raised an exception).
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
