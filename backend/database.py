from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

engine = create_engine(
    "sqlite:///./agents.db",
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def run_migrations():
    """Add new columns to existing tables without dropping data."""
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE agents ADD COLUMN system_prompt TEXT NOT NULL DEFAULT ''",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # Column already exists


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
